from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import Role, UserRole
from vendors.models import Vendor, VendorKYCRequest, VendorVerification


class VendorKYCRequestTests(TestCase):
    def setUp(self):
        users = get_user_model().objects
        self.admin = users.create_user(username="request-admin")
        admin_role, _ = Role.objects.get_or_create(name="Admin")
        UserRole.objects.create(user=self.admin, role=admin_role)
        self.owner = users.create_user(username="request-owner", password="Vendor!Test52")
        vendor_role, _ = Role.objects.get_or_create(name="Vendor")
        UserRole.objects.create(user=self.owner, role=vendor_role)
        self.vendor = Vendor.objects.create(user=self.owner, vendor_name="Owner", brand_name="Brand", phone="9876543210", stage="APPROVED")
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.request_url = f"/api/vendors/{self.vendor.pk}/kyc-request/"
        self.submit_url = f"/api/vendors/{self.vendor.pk}/kyc-submission/"
        self.pan = {"pan_number": "ABCDE1234F", "pan_name": "Example Owner", "pan_dob": "1990-01-01"}

    def request_details(self):
        response = self.client.post(self.request_url)
        self.assertEqual(response.status_code, 200, response.data)
        return response

    def as_vendor(self):
        self.client.force_authenticate(self.owner)

    def test_staff_request_appears_in_vendor_portal_notification(self):
        self.request_details()
        self.as_vendor()
        response = self.client.get(f"/api/vendors/{self.vendor.pk}/portal-dashboard/")
        self.assertEqual(response.status_code, 200, response.data)
        note = next(row for row in response.data["notifications"] if row["kind"] == "KYC")
        self.assertEqual(note["action_url"], "/vendor-kyc-details")
        self.assertFalse(note["read"])
        self.assertNotIn(self.pan["pan_number"], note["message"])
        self.assertEqual(response.data["kyc_request"]["status"], "REQUESTED")

    def test_request_is_idempotent_while_pending(self):
        first = self.request_details().data["kyc_request"]["requested_at"]
        second = self.request_details().data["kyc_request"]["requested_at"]
        self.assertEqual(first, second)
        self.assertEqual(VendorKYCRequest.objects.count(), 1)

    @patch("vendors.workspace_api.verify_identifiers")
    def test_vendor_submits_pan_without_automatic_provider_verification(self, verify):
        self.request_details()
        self.as_vendor()
        response = self.client.post(self.submit_url, self.pan, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        record = VendorVerification.objects.get(vendor=self.vendor)
        self.assertEqual(record.pan_number, self.pan["pan_number"])
        self.assertEqual(record.pan_name, self.pan["pan_name"])
        self.assertEqual(record.pan_status, "PENDING")
        self.assertEqual(response.data["kyc_request"]["status"], "SUBMITTED")
        self.assertIsNotNone(response.data["kyc_request"]["submitted_at"])
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.stage, "APPROVED")
        verify.assert_not_called()

    def test_staff_can_see_submitted_details(self):
        self.request_details()
        self.as_vendor()
        self.client.post(self.submit_url, self.pan, format="json")
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/vendors/kyc/")
        self.assertEqual(response.data[0]["verification"]["pan_number"], self.pan["pan_number"])
        self.assertEqual(response.data[0]["kyc_request"]["status"], "SUBMITTED")

    def test_other_vendor_cannot_read_or_submit_pan(self):
        self.request_details()
        other = get_user_model().objects.create_user(username="other-pan-owner")
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get(self.submit_url).status_code, 403)
        self.assertEqual(self.client.post(self.submit_url, self.pan, format="json").status_code, 403)

    def test_vendor_cannot_set_results_or_request_kyc(self):
        self.request_details()
        self.as_vendor()
        self.assertEqual(self.client.post(self.request_url).status_code, 403)
        self.assertEqual(self.client.post(f"/api/vendors/{self.vendor.pk}/kyc/").status_code, 403)
        response = self.client.post(self.submit_url, {**self.pan, "pan_status": "VERIFIED"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(VendorVerification.objects.exists())

    @patch("vendors.workspace_api.verify_identifiers")
    def test_vendor_can_submit_initial_pan_without_staff_request(self, verify):
        self.as_vendor()
        response = self.client.post(self.submit_url, self.pan, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["kyc_request"]["status"], "SUBMITTED")
        self.assertEqual(response.data["kyc_status"], "PENDING")
        self.assertEqual(self.client.post(self.submit_url, self.pan, format="json").status_code, 400)
        verify.assert_not_called()

    def test_invalid_initial_submission_does_not_create_request(self):
        self.as_vendor()
        response = self.client.post(self.submit_url, {**self.pan, "pan_number": "invalid"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(VendorKYCRequest.objects.filter(vendor=self.vendor).exists())

    def test_invalid_pan_and_future_dob_are_rejected(self):
        self.request_details()
        self.as_vendor()
        for changes in [{"pan_number": "invalid"}, {"pan_name": ""}, {"pan_dob": "2999-01-01"}, {"gst_number": "27ABCDE9876F1Z5"}]:
            response = self.client.post(self.submit_url, {**self.pan, **changes}, format="json")
            self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(VendorVerification.objects.exists())

    def test_submitted_request_can_be_reopened_by_staff(self):
        self.request_details()
        self.as_vendor()
        self.client.post(self.submit_url, self.pan, format="json")
        self.assertEqual(self.client.post(self.submit_url, self.pan, format="json").status_code, 400)
        self.client.force_authenticate(self.admin)
        response = self.request_details()
        self.assertEqual(response.data["kyc_request"]["status"], "REQUESTED")
        self.assertIsNone(response.data["kyc_request"]["submitted_at"])

    def test_status_poll_contains_no_pan_details(self):
        self.request_details()
        self.as_vendor()
        response = self.client.get(self.submit_url + "?status_only=1")
        self.assertEqual(set(response.data), {"kyc_request"})

    def test_request_requires_linked_active_login(self):
        self.vendor.user = None
        Vendor.objects.filter(pk=self.vendor.pk).update(user=None)
        self.assertEqual(self.client.post(self.request_url).status_code, 400)
        self.assertFalse(VendorKYCRequest.objects.exists())

    def test_notification_can_be_marked_read(self):
        self.request_details()
        self.as_vendor()
        self.client.post(f"/api/vendors/{self.vendor.pk}/portal-dashboard/mark-read/")
        response = self.client.get(f"/api/vendors/{self.vendor.pk}/portal-dashboard/")
        note = next(row for row in response.data["notifications"] if row["kind"] == "KYC")
        self.assertTrue(note["read"])
