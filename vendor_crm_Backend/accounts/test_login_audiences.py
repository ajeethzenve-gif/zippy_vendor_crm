from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from vendors.models import Vendor
from .models import Role, UserRole


class LoginAudienceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.password = "VendorLogin!Test92"
        cls.vendor_user = get_user_model().objects.create_user(
            "vendor.login", "vendor.login@example.com", cls.password
        )
        role, _ = Role.objects.get_or_create(name="Vendor")
        UserRole.objects.create(user=cls.vendor_user, role=role)
        cls.vendor = Vendor.objects.create(user=cls.vendor_user, vendor_name="Test Vendor")
        cls.staff_users = []
        for index, name in enumerate(["Admin", "Merchandiser", "Catalogue QA", "Operations", "Finance", "Media"]):
            user = get_user_model().objects.create_user(f"staff{index}", password=cls.password)
            role, _ = Role.objects.get_or_create(name=name)
            UserRole.objects.create(user=user, role=role)
            cls.staff_users.append(user)
        cls.superuser = get_user_model().objects.create_superuser(
            "login.admin", "login.admin@example.com", cls.password
        )

    def setUp(self):
        self.client = APIClient()

    def login(self, user, audience, **changes):
        return self.client.post("/api/login/", {
            "username": user.username, "password": self.password,
            "audience": audience, **changes,
        }, format="json")

    def test_vendor_can_login_by_username_or_email(self):
        for identifier in [self.vendor_user.username, self.vendor_user.email.upper()]:
            with self.subTest(identifier=identifier):
                response = self.login(self.vendor_user, "vendor", username=identifier)
                self.assertEqual(response.status_code, 200, response.data)
                self.assertEqual(response.data["vendor_id"], self.vendor.pk)
                self.assertEqual(response.data["role"], "Vendor")
                self.assertIn("access", response.data)

    def test_staff_roles_and_superuser_use_staff_login_only(self):
        for user in [*self.staff_users, self.superuser]:
            with self.subTest(user=user.username):
                self.assertEqual(self.login(user, "staff").status_code, 200)
                with patch("accounts.views.RefreshToken.for_user") as issue_token:
                    response = self.login(user, "vendor")
                    self.assertEqual(response.status_code, 403)
                    self.assertNotIn("access", response.data)
                    issue_token.assert_not_called()

    def test_vendor_cannot_create_staff_session(self):
        with patch("accounts.views.RefreshToken.for_user") as issue_token:
            response = self.login(self.vendor_user, "staff")
            self.assertEqual(response.status_code, 403)
            issue_token.assert_not_called()

    def test_vendor_role_requires_linked_vendor_record(self):
        self.vendor.user = None
        self.vendor.save(update_fields=["user"])
        self.assertEqual(self.login(self.vendor_user, "vendor").status_code, 403)

    def test_invalid_password_and_disabled_account_cannot_login(self):
        self.assertEqual(self.login(self.vendor_user, "vendor", password="wrong").status_code, 401)
        self.vendor_user.is_active = False
        self.vendor_user.save(update_fields=["is_active"])
        self.assertEqual(self.login(self.vendor_user, "vendor").status_code, 401)

    def test_other_roles_and_unknown_audience_are_rejected(self):
        user = get_user_model().objects.create_user("customer.login", password=self.password)
        role, _ = Role.objects.get_or_create(name="Customer")
        UserRole.objects.create(user=user, role=role)
        self.assertEqual(self.login(user, "vendor").status_code, 403)
        self.assertEqual(self.login(user, "staff").status_code, 403)
        self.assertEqual(self.login(self.vendor_user, "unknown").status_code, 400)

    def test_existing_login_without_audience_is_compatible(self):
        response = self.client.post("/api/login/", {
            "username": self.vendor_user.username, "password": self.password,
        }, format="json")
        self.assertEqual(response.status_code, 200)
