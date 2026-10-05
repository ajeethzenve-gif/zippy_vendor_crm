from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import Role, UserRole
from vendors.models import Vendor


class VendorApprovalAccountTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.vendor = Vendor.objects.create(vendor_name="Approved Owner", brand_name="Brand", email="approved@example.com", phone="9876543210", stage="LEAD", kyc_status="VERIFIED")

    def approve(self):
        return self.client.patch(f"/api/vendors/{self.vendor.pk}/", {"stage": "APPROVED"}, format="json")

    def test_crm_approval_creates_user_and_vendor_role(self):
        self.assertIsNone(self.vendor.user_id)
        response = self.approve()
        self.assertEqual(response.status_code, 200, response.data)
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.user.email, "approved@example.com")
        self.assertEqual(self.vendor.user.first_name, "Approved Owner")
        self.assertTrue(self.vendor.user.is_active)
        self.assertFalse(self.vendor.user.has_usable_password())
        self.assertEqual(self.vendor.user.user_role.role.name, "Vendor")
        self.assertEqual(self.approve().status_code, 200)
        self.assertEqual(get_user_model().objects.count(), 1)
        self.assertEqual(UserRole.objects.count(), 1)

    def test_existing_linked_account_keeps_password_and_gains_role(self):
        user = get_user_model().objects.create_user(username="existing-vendor", password="StrongPassword!52")
        self.vendor.user = user
        self.vendor.save()
        self.assertEqual(self.approve().status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password("StrongPassword!52"))
        self.assertEqual(user.user_role.role.name, "Vendor")
        self.assertEqual(get_user_model().objects.count(), 1)

    def test_direct_model_approval_also_provisions_account(self):
        self.vendor.stage = "APPROVED"
        self.vendor.save()
        self.assertIsNotNone(self.vendor.user_id)
        self.assertEqual(self.vendor.user.user_role.role.name, "Vendor")

    def test_email_conflict_does_not_approve_or_claim_existing_user(self):
        get_user_model().objects.create_user(username="unrelated", email="APPROVED@example.com")
        self.assertEqual(self.approve().status_code, 400)
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.stage, "LEAD")
        self.assertIsNone(self.vendor.user_id)
        self.assertFalse(UserRole.objects.exists())

    def test_role_failure_rolls_back_account_and_approval(self):
        with patch("vendors.account_service.UserRole.objects.update_or_create", side_effect=RuntimeError("role failure")):
            with self.assertRaises(RuntimeError):
                self.approve()
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.stage, "LEAD")
        self.assertIsNone(self.vendor.user_id)
        self.assertFalse(get_user_model().objects.exists())

    def test_approval_waits_for_verified_kyc(self):
        self.vendor.kyc_status = "PENDING"
        self.vendor.stage = "APPROVED"
        self.vendor.save()
        self.assertIsNone(self.vendor.user_id)
        self.assertFalse(UserRole.objects.exists())
        self.vendor.kyc_status = "VERIFIED"
        self.vendor.save(update_fields=["kyc_status"])
        self.assertIsNotNone(self.vendor.user_id)
