"""ApiTxt integration based on its PAN Verify and PAN-to-GSTIN API docs.

https://apitxt.com/developer/pan-verify-api
https://apitxt.com/developer/pan-gstin-verify-api
"""
from datetime import date
import requests
from django.conf import settings
from .kyc_provider import VerificationUnavailable

BASE_URL = "https://apitxt.com/api/"


def _request(endpoint, authkey, payload):
    try:
        response = requests.post(BASE_URL + endpoint, json={"authkey": authkey, **payload}, timeout=20, allow_redirects=False)
        response.raise_for_status()
        if response.status_code != 200:
            raise ValueError("Unexpected HTTP status")
        result = response.json()
        if not isinstance(result, dict) or str(result.get("status")) != "200":
            raise ValueError("Provider rejected request")
        if not isinstance(result.get("data"), dict) or not result.get("request_id"):
            raise ValueError("Missing verification response")
        return result
    except (requests.RequestException, ValueError, TypeError) as error:
        raise VerificationUnavailable("ApiTxt could not complete verification. Check the KYC auth key, account balance, IP permissions, and try again.") from error


def verify(gst_number, pan_number, pan_name="", pan_dob=None):
    authkey = getattr(settings, "APITXT_KYC_AUTH_KEY", "")
    if not authkey:
        raise VerificationUnavailable("Set APITXT_KYC_AUTH_KEY in the backend environment and restart the backend to enable GST/PAN checks.")
    if not pan_name.strip() or not isinstance(pan_dob, date):
        raise VerificationUnavailable("Enter the name and date of birth printed on the PAN before verifying.")
    pan = _request("panVerify", authkey, {"pan": pan_number, "name": pan_name.strip(), "dob": pan_dob.strftime("%d/%m/%Y")})
    pan_data = pan["data"]
    if str(pan_data.get("pan", "")).strip().upper() != pan_number:
        raise VerificationUnavailable("ApiTxt returned a different PAN. No KYC approval was recorded.")
    if not isinstance(pan_data.get("verified"), bool):
        raise VerificationUnavailable("ApiTxt returned an incomplete PAN result. No KYC approval was recorded.")
    reference = str(pan["request_id"])
    if pan_data["verified"] is False or pan_data.get("name_match") is False or pan_data.get("dob_match") is False:
        return {"pan_status": "REJECTED", "gst_status": "PENDING", "reference": reference}
    if str(pan_data.get("status", "")).lower() != "valid" or pan_data.get("name_match") is not True or pan_data.get("dob_match") is not True:
        raise VerificationUnavailable("ApiTxt did not confirm the PAN, name and date of birth. No KYC approval was recorded.")
    if not gst_number:
        return {"pan_status": "VERIFIED", "gst_status": "PENDING", "reference": reference}
    gst = _request("panGstinVerify", authkey, {"pan": pan_number})
    data = gst["data"]
    if str(data.get("pan", "")).strip().upper() != pan_number or not isinstance(data.get("gstin_list"), list):
        raise VerificationUnavailable("ApiTxt returned an incomplete GSTIN lookup. No KYC approval was recorded.")
    reference += ";" + str(gst["request_id"])
    if data.get("status") == "GSTIN_NOT_FOUND" and not data["gstin_list"]:
        return {"pan_status": "VERIFIED", "gst_status": "REJECTED", "reference": reference}
    if data.get("status") != "SUCCESS":
        raise VerificationUnavailable("ApiTxt could not confirm the GSTIN lookup. No KYC approval was recorded.")
    matches = [row for row in data["gstin_list"] if isinstance(row, dict) and str(row.get("gstin", "")).strip().upper() == gst_number]
    if len(matches) > 1:
        raise VerificationUnavailable("ApiTxt returned ambiguous GSTIN results. No KYC approval was recorded.")
    if not matches:
        gst_status = "REJECTED"
    else:
        status = str(matches[0].get("status", "")).strip().upper()
        if status not in {"ACTIVE", "CANCELLED", "SUSPENDED"}:
            raise VerificationUnavailable("ApiTxt returned an unknown GSTIN status. No KYC approval was recorded.")
        gst_status = "VERIFIED" if status == "ACTIVE" else "REJECTED"
    return {"pan_status": "VERIFIED", "gst_status": gst_status, "reference": reference}
