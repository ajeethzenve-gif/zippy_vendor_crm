from datetime import timedelta
from smtplib import SMTPAuthenticationError
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.db import transaction
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Role, UserRole
from orders.serializers import OrderSerializer
from products.models import Product
from vendors.kyc_links import issue_token
from vendors.models import Vendor, VendorKYCRequest, VendorVerification
from vendors.notifications import portal_url


class VendorPortalURLTests(SimpleTestCase):
    def test_origin_and_login_url_generate_correct_destinations(self):
        for value in ["https://portal.example.com", "https://portal.example.com/",
                      "https://portal.example.com/vendor-login", " https://portal.example.com/vendor-login/ "]:
            with self.subTest(value=value), override_settings(VENDOR_PORTAL_URL=value):
                self.assertEqual(portal_url("/vendor-login"), "https://portal.example.com/vendor-login")
                self.assertEqual(portal_url("/vendor-kyc-submit"), "https://portal.example.com/vendor-kyc-submit")

    def test_invalid_destinations_still_rejected(self):
        for value in ["", "http://portal.example.com", "https://user:password@portal.example.com",
                      "https://portal.example.com/unknown", "https://portal.example.com?redirect=elsewhere",
                      "https://portal.example.com#token", "https://[", "https://portal.example.com:bad"]:
            with self.subTest(value=value), override_settings(VENDOR_PORTAL_URL=value):
                with self.assertLogs("vendors.notifications", level="ERROR"):
                    self.assertIsNone(portal_url("/vendor-kyc-submit"))


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", VENDOR_PORTAL_URL="https://portal.example.com")
class VendorNotificationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = get_user_model().objects.create_user(username="email-admin")
        role, _ = Role.objects.get_or_create(name="Admin")
        UserRole.objects.create(user=self.admin, role=role)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.vendor = Vendor.objects.create(vendor_name="Email Owner", brand_name="Email Brand", email="owner@example.com", phone="9876543210")
        self.pan = {"pan_number": "ABCDE1234F", "pan_name": "Email Owner", "pan_dob": "1990-01-01"}

    def approve(self):
        with self.captureOnCommitCallbacks(execute=True):
            self.vendor.stage = "APPROVED"
            self.vendor.save()
        self.vendor.refresh_from_db()

    def start_kyc(self):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(f"/api/vendors/{self.vendor.pk}/kyc-request/")
        self.assertEqual(response.status_code, 200, response.data)
        row = VendorKYCRequest.objects.get(vendor=self.vendor)
        return row, issue_token(row)

    def test_created_vendor_gets_pending_welcome_once(self):
        with self.captureOnCommitCallbacks(execute=True):
            vendor = Vendor.objects.create(vendor_name="New", brand_name="New Brand", email="new@example.com")
            vendor.city = "Bengaluru"
            vendor.save()
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["new@example.com"])
        self.assertIn("pending approval", mail.outbox[0].body)
        self.assertIn("29AACCZ7283R1Z5", mail.outbox[0].body)
        self.assertNotIn("password:", mail.outbox[0].body.lower())

    @override_settings(VENDOR_FROM_EMAIL="vendor-sender@example.com", DEFAULT_FROM_EMAIL="general@example.com")
    def test_vendor_notifications_use_dedicated_sender(self):
        self.approve()
        self.assertEqual(mail.outbox[0].from_email, "vendor-sender@example.com")

    def test_approved_vendor_gets_working_credentials_and_otp_instructions(self):
        self.approve()
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertIn("Login: https://portal.example.com/\n", message.body)
        self.assertIn(self.vendor.user.username, message.body)
        password = message.body.split("Initial password: ", 1)[1].splitlines()[0]
        self.assertTrue(self.vendor.user.check_password(password))
        self.assertIn("SMS", message.body)
        with self.captureOnCommitCallbacks(execute=True):
            self.vendor.save()
        self.assertEqual(len(mail.outbox), 1)

    def test_existing_password_is_not_reset_or_emailed(self):
        user = get_user_model().objects.create_user(username="existing-email", password="KeepThis!52")
        self.vendor.user = user
        self.approve()
        user.refresh_from_db()
        self.assertTrue(user.check_password("KeepThis!52"))
        self.assertNotIn("KeepThis!52", mail.outbox[0].body)
        self.assertIn("existing password", mail.outbox[0].body)

    def test_rolled_back_creation_sends_no_email(self):
        with self.captureOnCommitCallbacks(execute=True):
            with self.assertRaises(RuntimeError):
                with transaction.atomic():
                    Vendor.objects.create(vendor_name="Rollback", brand_name="Rollback", email="rollback@example.com")
                    raise RuntimeError
        self.assertEqual(len(mail.outbox), 0)

    @patch("vendors.notifications.send_mail", side_effect=RuntimeError("SMTP unavailable"))
    def test_smtp_failure_does_not_undo_approval(self, send):
        self.approve()
        self.assertEqual(self.vendor.stage, "APPROVED")
        self.assertIsNotNone(self.vendor.user_id)

    @patch("vendors.notifications.send_mail", side_effect=SMTPAuthenticationError(535, b"private-provider-response"))
    def test_smtp_error_code_is_logged_without_private_response(self, send):
        with self.assertLogs("vendors.notifications", level="ERROR") as captured:
            self.approve()
        output = " ".join(captured.output)
        self.assertIn("SMTPAuthenticationError", output)
        self.assertIn("SMTP code=535", output)
        self.assertNotIn("private-provider-response", output)

    @patch("vendors.notifications.send_mail", side_effect=SMTPAuthenticationError(535, b"authentication failed"))
    def test_api_approval_succeeds_even_when_smtp_authentication_fails(self, send):
        with self.assertLogs("vendors.notifications", level="ERROR"):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.patch(f"/api/vendors/{self.vendor.pk}/", {"stage": "APPROVED"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["stage"], "APPROVED")
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.stage, "APPROVED")
        self.assertIsNotNone(self.vendor.user_id)

    def test_order_emails_include_only_owned_catalogue_items(self):
        other = Vendor.objects.create(vendor_name="Second", brand_name="Other Brand", email="other@example.com")
        first = Product.objects.create(vendor=self.vendor, sku="EMAIL-FIRST", product_name="First Product", mrp=100, selling_price=90)
        second = Product.objects.create(vendor=other, sku="EMAIL-SECOND", product_name="Second Product", mrp=250, selling_price=200)
        serializer = OrderSerializer(data={
            "shipping_full_name": "Private Customer", "shipping_email": "customer@private.example",
            "shipping_phone": "9998887776", "shipping_address_line1": "Private Street 99",
            "items": [{"product_id": str(first.pk), "product_name": "Private Customer", "quantity": 2, "price": "90.00"},
                      {"product_id": str(second.pk), "product_name": "Second Product", "quantity": 1, "price": "200.00"}],
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        with self.captureOnCommitCallbacks(execute=True):
            order = serializer.save()
        self.assertEqual(len(mail.outbox), 2)
        messages = {message.to[0]: message.body for message in mail.outbox}
        first_body = messages["owner@example.com"]
        self.assertIn("First Product", first_body)
        self.assertIn("Quantity: 2", first_body)
        self.assertIn("180.00", first_body)
        self.assertNotIn("Second Product", first_body)
        self.assertNotIn("380.00", first_body)
        for message in mail.outbox:
            for private in ["Private Customer", "customer@private.example", "9998887776", "Private Street"]:
                self.assertNotIn(private, message.body)
        self.assertNotIn("First Product", messages["other@example.com"])
        with self.captureOnCommitCallbacks(execute=True):
            order.save()
        self.assertEqual(len(mail.outbox), 2)

    def test_kyc_email_link_allows_submission_once_without_login(self):
        self.approve()
        row, token = self.start_kyc()
        message = mail.outbox[-1]
        self.assertIn("48 hours", message.body)
        link = next(line for line in message.body.splitlines() if line.startswith("https://"))
        self.assertEqual(parse_qs(urlsplit(link).fragment)["token"][0], token)
        self.assertEqual(urlsplit(link).query, "")
        anonymous = APIClient()
        response = anonymous.get("/api/vendors/kyc-link/", HTTP_AUTHORIZATION=f"KYC {token}")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("verification", response.data)
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertIn(anonymous.get(f"/api/vendors/{self.vendor.pk}/kyc-submission/", HTTP_AUTHORIZATION=f"KYC {token}").status_code, [401, 403])
        response = anonymous.post("/api/vendors/kyc-link/", self.pan, format="json", HTTP_AUTHORIZATION=f"KYC {token}")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(VendorVerification.objects.get(vendor=self.vendor).pan_number, self.pan["pan_number"])
        self.assertEqual(anonymous.post("/api/vendors/kyc-link/", self.pan, format="json", HTTP_AUTHORIZATION=f"KYC {token}").status_code, 403)

    def test_invalid_and_expired_links_are_rejected_and_can_be_reissued(self):
        self.approve()
        row, token = self.start_kyc()
        anonymous = APIClient()
        self.assertEqual(anonymous.get("/api/vendors/kyc-link/", HTTP_AUTHORIZATION=f"KYC {token}tampered").status_code, 403)
        future = timezone.now() + timedelta(hours=48, seconds=1)
        with patch("vendors.kyc_links.timezone.now", return_value=future):
            self.assertEqual(anonymous.get("/api/vendors/kyc-link/", HTTP_AUTHORIZATION=f"KYC {token}").status_code, 403)
        VendorKYCRequest.objects.filter(pk=row.pk).update(requested_at=timezone.now() - timedelta(hours=49))
        row.refresh_from_db()
        expired_token = issue_token(row)
        self.assertEqual(anonymous.get("/api/vendors/kyc-link/", HTTP_AUTHORIZATION=f"KYC {expired_token}").status_code, 403)
        new_row, fresh_token = self.start_kyc()
        self.assertNotEqual(fresh_token, token)
        self.assertEqual(anonymous.get("/api/vendors/kyc-link/", HTTP_AUTHORIZATION=f"KYC {token}").status_code, 403)
        self.assertEqual(anonymous.get("/api/vendors/kyc-link/", HTTP_AUTHORIZATION=f"KYC {fresh_token}").status_code, 200)

    def test_pending_kyc_request_does_not_duplicate_email(self):
        self.approve()
        self.start_kyc()
        count = len(mail.outbox)
        self.start_kyc()
        self.assertEqual(len(mail.outbox), count)

    def test_invalid_pan_does_not_consume_link_or_allow_vendor_override(self):
        self.approve()
        _, token = self.start_kyc()
        anonymous = APIClient()
        for payload in [{**self.pan, "pan_number": "invalid"}, {**self.pan, "vendor": 999}]:
            response = anonymous.post("/api/vendors/kyc-link/", payload, format="json", HTTP_AUTHORIZATION=f"KYC {token}")
            self.assertEqual(response.status_code, 400)
        self.assertFalse(VendorVerification.objects.filter(vendor=self.vendor).exists())
        self.assertEqual(anonymous.get("/api/vendors/kyc-link/", HTTP_AUTHORIZATION=f"KYC {token}").status_code, 200)

    @override_settings(VENDOR_PORTAL_URL="")
    def test_missing_portal_destination_does_not_send_access_links(self):
        self.approve()
        self.start_kyc()
        self.assertEqual(len(mail.outbox), 0)
