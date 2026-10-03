import hashlib
import re
from unittest.mock import Mock, patch
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from accounts.models import Role, UserRole
from vendors.models import Vendor


@override_settings(SMS_PROVIDER="APITXT", SMS_API_KEY="api-secret", SMS_AUTH_KEY="auth-secret", SMS_API_URL="https://apitxt.com/api/sendOTP")
class GeneratedVendorOTPTests(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(username="generated-otp-owner")
        role, _ = Role.objects.get_or_create(name="Vendor")
        UserRole.objects.create(user=self.user, role=role)
        self.vendor = Vendor.objects.create(user=self.user, vendor_name="Owner", phone="9876543210")
        self.sender = patch("accounts.services.sms_service.requests.post").start()
        self.addCleanup(patch.stopall)
        self.sender.return_value = Mock(json=Mock(return_value={"status": "success", "data": {"request_id": "SMS-OTP-test"}}))

    def send(self):
        response = self.client.post("/api/vendor-otp/send/", {"phone": self.vendor.phone})
        self.assertEqual(response.status_code, 200)
        return response.data["challenge"], self.sender.call_args.kwargs["json"]["otp"]

    def verify(self, challenge, code):
        return self.client.post("/api/vendor-otp/verify/", {"challenge": challenge, "otp": code})

    def test_generated_code_is_hashed_and_logs_in_only_its_vendor(self):
        challenge, code = self.send()
        pending = cache.get("vendor-otp:" + challenge)
        self.assertNotIn(code, str(pending))
        self.assertEqual(pending["mode"], "sms")
        self.assertEqual(self.sender.call_args.kwargs["json"]["mobile"], "919876543210")
        self.assertEqual(self.sender.call_args.kwargs["json"]["authkey"], "auth-secret")
        self.assertEqual(self.sender.call_args.kwargs["headers"]["Authorization"], "Bearer api-secret")
        wrong = "111111" if code != "111111" else "222222"
        self.assertEqual(self.verify(challenge, wrong).status_code, 400)
        login = self.verify(challenge, code)
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.data["vendor_id"], self.vendor.pk)
        self.assertIn("access", login.data)
        self.assertEqual(self.verify(challenge, code).status_code, 400)
        self.assertEqual(self.sender.call_count, 1)

    def test_unknown_phone_never_generates_or_sends_code(self):
        with patch("accounts.services.sms_service.secrets.randbelow") as generator:
            response = self.client.post("/api/vendor-otp/send/", {"phone": "9999999999"})
        self.assertEqual(response.status_code, 400)
        generator.assert_not_called()
        self.sender.assert_not_called()

    def test_resend_invalidates_previous_challenge(self):
        previous, old_code = self.send()
        cooldown = "vendor-otp-send:" + hashlib.sha256(b"+919876543210").hexdigest()
        cache.delete(cooldown)
        current, code = self.send()
        self.assertEqual(self.verify(previous, old_code).status_code, 400)
        self.assertEqual(self.verify(current, code).status_code, 200)

    def test_expired_generated_code_never_logs_in(self):
        challenge, code = self.send()
        key = "vendor-otp:" + challenge
        pending = cache.get(key)
        pending["expires"] = 1
        cache.set(key, pending)
        self.assertEqual(self.verify(challenge, code).status_code, 400)

    @override_settings(SMS_AUTH_KEY="")
    def test_single_api_key_is_used_for_both_authentication_fields(self):
        self.send()
        self.assertEqual(self.sender.call_args.kwargs["json"]["authkey"], "api-secret")
        self.assertEqual(self.sender.call_args.kwargs["headers"]["Authorization"], "Bearer api-secret")

    @override_settings(SMS_API_KEY="", SMS_AUTH_KEY="")
    def test_missing_api_key_never_sends_sms(self):
        response = self.client.post("/api/vendor-otp/send/", {"phone": self.vendor.phone})
        self.assertEqual(response.status_code, 503)
        self.assertIn("SMS_API_KEY", response.data["message"])
        self.sender.assert_not_called()

    def test_provider_rejection_does_not_issue_challenge(self):
        self.sender.return_value.json.return_value = {"status": "error", "message": "bad credentials"}
        response = self.client.post("/api/vendor-otp/send/", {"phone": self.vendor.phone})
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("challenge", response.data)
