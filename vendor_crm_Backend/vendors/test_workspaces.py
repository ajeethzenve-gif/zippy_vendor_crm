from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from accounts.models import Role, UserRole
from vendors.models import Vendor, VendorVerification, SocialMediaPost
from vendors.kyc_provider import VerificationUnavailable


class VendorWorkspaceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(username="workspaces-admin")
        role, _ = Role.objects.get_or_create(name="Admin")
        UserRole.objects.create(user=self.user, role=role)
        self.client.force_authenticate(self.user)
        self.vendor = Vendor.objects.create(vendor_name="Owner", brand_name="Pet Brand", phone="9876543210", stage="APPROVED", kyc_status="PENDING")
        self.kyc_url = f"/api/vendors/{self.vendor.pk}/kyc/"
        self.ids = {"gst_number": "27ABCDE1234F1Z5", "pan_number": "ABCDE1234F", "pan_name": "Example Owner", "pan_dob": "1990-01-01"}

    def save_kyc(self):
        response = self.client.patch(self.kyc_url, self.ids, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        return response

    def test_save_identifiers_does_not_verify_vendor(self):
        self.save_kyc()
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.kyc_status, "PENDING")
        self.assertIsNotNone(self.vendor.user_id)

    def test_identifiers_must_match(self):
        response = self.client.patch(self.kyc_url, {**self.ids, "pan_number": "ABCDE9876F"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(VendorVerification.objects.exists())

    @patch("vendors.workspace_api.verify_identifiers")
    def test_without_gstin_kyc_uses_pan_result(self, verify):
        for pan_status in ["VERIFIED", "REJECTED", "PENDING"]:
            with self.subTest(pan_status=pan_status):
                response = self.client.patch(self.kyc_url, {**self.ids, "gst_number": ""}, format="json")
                self.assertEqual(response.status_code, 200, response.data)
                verify.return_value = {"gst_status": "PENDING", "pan_status": pan_status, "reference": "pan-check"}
                response = self.client.post(self.kyc_url)
                self.assertEqual(response.status_code, 200, response.data)
                self.assertEqual(response.data["kyc_status"], pan_status)
                self.assertEqual(response.data["verification"]["gst_status"], "PENDING")
                self.assertEqual(verify.call_args.args, ("", self.ids["pan_number"]))

    def test_optional_gstin_still_rejects_invalid_value(self):
        response = self.client.patch(self.kyc_url, {**self.ids, "gst_number": "INVALID"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_cannot_submit_verification_status(self):
        response = self.client.patch(self.kyc_url, {**self.ids, "gst_status": "VERIFIED"}, format="json")
        self.assertEqual(response.status_code, 400)

    @override_settings(VENDOR_KYC_ADAPTER="")
    def test_missing_provider_does_not_verify(self):
        self.save_kyc()
        response = self.client.post(self.kyc_url)
        self.assertEqual(response.status_code, 503)
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.kyc_status, "PENDING")

    @patch("vendors.workspace_api.verify_identifiers")
    def test_provider_success_updates_kyc_and_provisions_approved_vendor(self, verify):
        self.save_kyc()
        verify.return_value = {"gst_status": "VERIFIED", "pan_status": "VERIFIED", "reference": "check-123"}
        response = self.client.post(self.kyc_url)
        self.assertEqual(response.status_code, 200, response.data)
        from datetime import date
        verify.assert_called_once_with(self.ids["gst_number"], self.ids["pan_number"], pan_name="Example Owner", pan_dob=date(1990, 1, 1))
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.kyc_status, "VERIFIED")
        self.assertEqual(self.vendor.user.user_role.role.name, "Vendor")
        self.assertEqual(response.data["verification"]["provider_reference"], "check-123")

    @patch("vendors.workspace_api.verify_identifiers")
    def test_partial_verification_does_not_complete_kyc(self, verify):
        self.save_kyc()
        verify.return_value = {"gst_status": "VERIFIED", "pan_status": "REJECTED", "reference": "check-456"}
        self.assertEqual(self.client.post(self.kyc_url).status_code, 200)
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.kyc_status, "REJECTED")

    def test_changed_identifiers_invalidate_previous_results(self):
        self.save_kyc()
        VendorVerification.objects.filter(vendor=self.vendor).update(gst_status="VERIFIED", pan_status="VERIFIED", provider_reference="old-check")
        Vendor.objects.filter(pk=self.vendor.pk).update(kyc_status="VERIFIED")
        response = self.client.patch(self.kyc_url, {"gst_number": "27ABCDE9876F1Z5", "pan_number": "ABCDE9876F"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["kyc_status"], "PENDING")
        self.assertEqual(response.data["verification"]["provider_reference"], "")

    def test_social_post_persists_and_is_updated(self):
        response = self.client.post("/api/vendors/social-posts/", {"vendor": self.vendor.pk, "title": "Pet launch", "platform": "INSTAGRAM", "caption": "New collection"}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        post_id = response.data["id"]
        self.assertEqual(SocialMediaPost.objects.get(pk=post_id).created_by, self.user)
        response = self.client.patch(f"/api/vendors/social-posts/{post_id}/", {"status": "REVIEW"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get("/api/vendors/social-posts/?status=REVIEW").data[0]["id"], post_id)

    def test_scheduled_and_published_records_require_details(self):
        for data in [{"status": "SCHEDULED"}, {"status": "PUBLISHED"}]:
            response = self.client.post("/api/vendors/social-posts/", {"vendor": self.vendor.pk, "title": "Test", "platform": "INSTAGRAM", **data}, format="json")
            self.assertEqual(response.status_code, 400)
        self.assertFalse(SocialMediaPost.objects.exists())

    def test_vendor_role_cannot_access_staff_layers(self):
        role, _ = Role.objects.get_or_create(name="Vendor")
        self.user.user_role.role = role
        self.user.user_role.save()
        for url in ["/api/vendors/kyc/", "/api/vendors/social-posts/", "/api/vendors/workspace-vendors/"]:
            self.assertEqual(self.client.get(url).status_code, 403)
        self.assertEqual(self.client.patch(self.kyc_url, self.ids, format="json").status_code, 403)

    def test_finance_can_access_kyc_but_not_social(self):
        role, _ = Role.objects.get_or_create(name="Finance")
        self.user.user_role.role = role
        self.user.user_role.save()
        self.assertEqual(self.client.get("/api/vendors/kyc/").status_code, 200)
        self.assertEqual(self.client.get("/api/vendors/social-posts/").status_code, 403)

    def test_anonymous_cannot_access_layers(self):
        self.client.force_authenticate(None)
        for url in ["/api/vendors/kyc/", "/api/vendors/social-posts/"]:
            self.assertIn(self.client.get(url).status_code, [401, 403])

    def test_profile_tax_change_invalidates_kyc(self):
        self.save_kyc()
        Vendor.objects.filter(pk=self.vendor.pk).update(kyc_status="VERIFIED")
        VendorVerification.objects.filter(vendor=self.vendor).update(gst_status="VERIFIED", pan_status="VERIFIED", provider_reference="old-reference")
        response = self.client.patch(f"/api/vendors/{self.vendor.pk}/profile/", {"gst_number": "29ABCDE1234F1Z5"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.kyc_status, "PENDING")
        self.assertEqual(self.vendor.verification.gst_status, "PENDING")

    def test_provider_adapter_invalid_results_are_not_accepted(self):
        from vendors.kyc_provider import verify_identifiers
        with override_settings(VENDOR_KYC_ADAPTER="provider.verify"), patch("vendors.kyc_provider.import_string", return_value=lambda **kwargs: {"gst_status": "VERIFIED", "pan_status": "VERIFIED"}):
            with self.assertRaises(VerificationUnavailable):
                verify_identifiers(**self.ids)
