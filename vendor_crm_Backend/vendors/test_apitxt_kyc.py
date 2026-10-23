from copy import deepcopy
from datetime import date
from unittest.mock import Mock, patch
import requests
from django.test import SimpleTestCase, override_settings
from vendors.apitxt_kyc import verify
from vendors.kyc_provider import VerificationUnavailable, verify_identifiers


@override_settings(APITXT_KYC_AUTH_KEY="kyc-test-secret", VENDOR_KYC_ADAPTER="vendors.apitxt_kyc.verify")
class ApiTxtKYCTests(SimpleTestCase):
    def setUp(self):
        self.pan = {"status": 200, "request_id": "PAN-VER-test", "data": {"pan": "ABCDE1234F", "verified": True, "status": "valid", "name_match": True, "dob_match": True}}
        self.gst = {"status": 200, "request_id": "PANG-VER-test", "data": {"pan": "ABCDE1234F", "status": "SUCCESS", "gstin_list": [{"gstin": "27ABCDE1234F1Z5", "status": "ACTIVE"}]}}
        self.http = patch("vendors.apitxt_kyc.requests.post").start()
        self.addCleanup(patch.stopall)
        self.http.side_effect = lambda *args, **kwargs: self.response(self.pan if args[0].endswith("/panVerify") else self.gst)

    def response(self, value):
        response = Mock(status_code=200)
        response.json.return_value = deepcopy(value)
        return response

    def run_check(self):
        return verify_identifiers("27ABCDE1234F1Z5", "ABCDE1234F", pan_name="Example Owner", pan_dob=date(1990, 1, 2))

    def test_without_gstin_verifies_pan_without_gst_lookup(self):
        result = verify_identifiers("", "ABCDE1234F", pan_name="Example Owner", pan_dob=date(1990, 1, 2))
        self.assertEqual(result, {"pan_status": "VERIFIED", "gst_status": "PENDING", "reference": "PAN-VER-test"})
        self.http.assert_called_once()
        self.assertTrue(self.http.call_args.args[0].endswith("/panVerify"))

    def test_without_gstin_pan_mismatch_is_rejected(self):
        self.pan["data"]["name_match"] = False
        result = verify_identifiers("", "ABCDE1234F", pan_name="Example Owner", pan_dob=date(1990, 1, 2))
        self.assertEqual(result["pan_status"], "REJECTED")
        self.http.assert_called_once()

    def test_documented_requests_and_success(self):
        result = self.run_check()
        self.assertEqual(result["pan_status"], "VERIFIED")
        self.assertEqual(result["gst_status"], "VERIFIED")
        self.assertEqual(result["reference"], "PAN-VER-test;PANG-VER-test")
        first, second = self.http.call_args_list
        self.assertEqual(first.args, ("https://apitxt.com/api/panVerify",))
        self.assertEqual(first.kwargs["json"], {"authkey": "kyc-test-secret", "pan": "ABCDE1234F", "name": "Example Owner", "dob": "02/01/1990"})
        self.assertEqual(second.args, ("https://apitxt.com/api/panGstinVerify",))
        self.assertEqual(second.kwargs["json"], {"authkey": "kyc-test-secret", "pan": "ABCDE1234F"})
        self.assertEqual(first.kwargs["timeout"], 20)
        self.assertFalse(first.kwargs["allow_redirects"])
        self.assertNotIn("kyc-test-secret", str(result))

    def test_pan_mismatch_flags_reject_without_second_charge(self):
        for field in ["verified", "name_match", "dob_match"]:
            with self.subTest(field=field):
                self.pan["data"][field] = False
                self.http.reset_mock()
                result = self.run_check()
                self.assertEqual(result["pan_status"], "REJECTED")
                self.assertEqual(result["gst_status"], "PENDING")
                self.assertEqual(self.http.call_count, 1)
                self.pan["data"][field] = True

    def test_cancelled_and_suspended_gstin_are_rejected(self):
        for status in ["CANCELLED", "SUSPENDED"]:
            self.gst["data"]["gstin_list"][0]["status"] = status
            self.assertEqual(self.run_check()["gst_status"], "REJECTED")

    def test_gstin_not_found_is_not_verification(self):
        self.gst["data"].update(status="GSTIN_NOT_FOUND", gstin_list=[])
        self.assertEqual(self.run_check()["gst_status"], "REJECTED")

    def test_different_gstin_does_not_verify_requested_registration(self):
        self.gst["data"]["gstin_list"][0]["gstin"] = "29ABCDE1234F1Z5"
        self.assertEqual(self.run_check()["gst_status"], "REJECTED")

    def test_wrong_pan_echo_is_unavailable(self):
        self.pan["data"]["pan"] = "ABCDE9876F"
        with self.assertRaises(VerificationUnavailable):
            self.run_check()

    def test_top_level_success_is_not_enough(self):
        del self.pan["data"]["name_match"]
        with self.assertRaises(VerificationUnavailable):
            self.run_check()

    def test_unknown_gst_status_is_not_approved(self):
        self.gst["data"]["gstin_list"][0]["status"] = "UNKNOWN"
        with self.assertRaises(VerificationUnavailable):
            self.run_check()

    def test_provider_account_errors_do_not_become_identity_rejections(self):
        self.pan = {"status": 301, "message": "Secret provider error"}
        with self.assertRaises(VerificationUnavailable) as error:
            self.run_check()
        self.assertNotIn("Secret provider error", str(error.exception))

    def test_timeouts_fail_without_exposing_credentials(self):
        self.http.side_effect = requests.Timeout("kyc-test-secret")
        with self.assertRaises(VerificationUnavailable) as error:
            self.run_check()
        self.assertNotIn("kyc-test-secret", str(error.exception))

    def test_http_redirect_is_not_followed(self):
        response = self.response(self.pan)
        response.status_code = 302
        self.http.side_effect = None
        self.http.return_value = response
        with self.assertRaises(VerificationUnavailable):
            self.run_check()

    @override_settings(APITXT_KYC_AUTH_KEY="")
    def test_missing_credentials_never_call_provider(self):
        with self.assertRaisesRegex(VerificationUnavailable, "APITXT_KYC_AUTH_KEY"):
            self.run_check()
        self.http.assert_not_called()

    def test_name_and_dob_are_required(self):
        with self.assertRaises(VerificationUnavailable):
            verify("27ABCDE1234F1Z5", "ABCDE1234F")
        self.http.assert_not_called()
