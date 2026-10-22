from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from vendors.models import Vendor


class VendorProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(username="profile-owner")
        self.vendor = Vendor.objects.create(user=self.user, vendor_name="Owner", brand_name="Brand", phone="9876543210")
        self.url = f"/api/vendors/{self.vendor.pk}/profile/"
        self.client.force_authenticate(self.user)

    def test_owner_updates_profile(self):
        response = self.client.patch(self.url, {"brand_name": "Updated Brand", "city": "Pune"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.brand_name, "Updated Brand")
        self.assertEqual(self.vendor.city, "Pune")

    def test_other_vendor_cannot_edit_profile(self):
        other = get_user_model().objects.create_user(username="other-profile-owner")
        self.client.force_authenticate(other)
        self.assertEqual(self.client.patch(self.url, {"city": "Pune"}).status_code, 403)

    def test_anonymous_cannot_edit_profile(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.patch(self.url, {"city": "Pune"}).status_code, [401, 403])

    def test_owner_cannot_update_onboarding_fields(self):
        for field, value in [("stage", "APPROVED"), ("kyc_status", "VERIFIED"), ("take_rate", 0), ("credit_points", 10000), ("user", self.user.pk)]:
            response = self.client.patch(self.url, {field: value, "city": "Blocked"}, format="json")
            self.assertEqual(response.status_code, 400, response.data)
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.stage, "LEAD")
        self.assertEqual(self.vendor.city, "")

    def test_image_upload(self):
        import tempfile
        from django.test import override_settings
        from products.test_media import image_file
        with tempfile.TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory):
            response = self.client.patch(self.url, {"profile_image": image_file()}, format="multipart")
            self.assertEqual(response.status_code, 200, response.data)
            self.vendor.refresh_from_db()
            self.assertTrue(self.vendor.profile_image.name.startswith("vendors/profiles/"))
