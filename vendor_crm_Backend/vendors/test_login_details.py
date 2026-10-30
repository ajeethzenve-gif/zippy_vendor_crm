from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import Role, UserRole
from vendors.models import Vendor


class VendorLoginDetailsTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.admin = get_user_model().objects.create_user(username="login-share-admin")
        role, _ = Role.objects.get_or_create(name="Admin")
        UserRole.objects.create(user=self.admin, role=role)
        self.client.force_authenticate(self.admin)
        self.vendor = Vendor.objects.create(vendor_name="Edwin", brand_name="Example Brand", phone="9876543210", stage="APPROVED")
        self.url = f"/api/vendors/{self.vendor.pk}/login-details/"

    def test_staff_can_prepare_actual_username_and_verified_initial_password(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["username"], self.vendor.user.username)
        self.assertEqual(response.data["username"], "edwin@zv")
        self.assertEqual(response.data["initial_password"], "edwin@zv3210")
        self.assertTrue(self.vendor.user.check_password(response.data["initial_password"]))
        self.assertEqual(set(response.data), {"username", "initial_password"})
        self.assertEqual(response["Cache-Control"], "no-store")

    def test_changed_password_is_not_disclosed_or_reset(self):
        user = self.vendor.user
        user.username = "custom-username"
        user.set_password("ChangedPassword!52")
        user.save()
        response = self.client.get(self.url)
        self.assertEqual(response.data["username"], "custom-username")
        self.assertIsNone(response.data["initial_password"])
        user.refresh_from_db()
        self.assertTrue(user.check_password("ChangedPassword!52"))

    def test_legacy_initial_login_can_still_be_shared_without_resetting(self):
        user = self.vendor.user
        user.username = "edwin@zenvefashion"
        user.set_password("edwin@zf543210")
        user.save()
        response = self.client.get(self.url)
        self.assertEqual(response.data["username"], "edwin@zenvefashion")
        self.assertEqual(response.data["initial_password"], "edwin@zf543210")
        user.refresh_from_db()
        self.assertTrue(user.check_password("edwin@zf543210"))

    def test_changed_mobile_does_not_generate_a_false_password(self):
        self.vendor.phone = "9876512345"
        self.vendor.save()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["initial_password"])

    def test_vendor_and_unrelated_staff_cannot_read_credentials(self):
        for user in [self.vendor.user, get_user_model().objects.create_user(username="unassigned-login")]:
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get(self.url).status_code, 403)
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(self.url).status_code, [401, 403])

    def test_merchandiser_can_share_login(self):
        role, _ = Role.objects.get_or_create(name="Merchandiser")
        self.admin.user_role.role = role
        self.admin.user_role.save()
        self.assertEqual(self.client.get(self.url).status_code, 200)

    def test_pending_or_inactive_accounts_do_not_expose_credentials(self):
        pending = Vendor.objects.create(vendor_name="Pending", brand_name="Pending Brand")
        self.assertEqual(self.client.get(f"/api/vendors/{pending.pk}/login-details/").status_code, 400)
        user = self.vendor.user
        user.is_active = False
        user.save()
        self.assertEqual(self.client.get(self.url).status_code, 400)

    def test_general_vendor_listing_does_not_expose_credentials(self):
        response = self.client.get(f"/api/vendors/{self.vendor.pk}/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("initial_password", response.data)
        self.assertNotIn("password", response.data)
