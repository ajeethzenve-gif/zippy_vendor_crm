import secrets
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password


class SMSConfigurationError(RuntimeError):
    pass


class SMSDeliveryError(RuntimeError):
    pass


def send_login_otp(phone):
    if settings.SMS_PROVIDER.upper() != "APITXT":
        raise SMSConfigurationError("Set SMS_PROVIDER=APITXT in the backend settings.")
    api_key = settings.SMS_API_KEY
    auth_key = getattr(settings, "SMS_AUTH_KEY", "") or api_key
    missing = ["SMS_API_KEY"] if not api_key or api_key.startswith("your_") else []
    if missing:
        raise SMSConfigurationError("Mobile OTP is not configured. Set " + ", ".join(missing) + " in the backend .env and restart the backend.")
    url = settings.SMS_API_URL
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in {"apitxt.com", "www.apitxt.com"}:
        raise SMSConfigurationError("SMS_API_URL must use the HTTPS ApiTxt API endpoint.")
    otp = f"{secrets.randbelow(1000000):06d}"
    payload = {"authkey": auth_key, "mobile": phone.lstrip("+"), "otp": otp, "channel": "sms"}
    response = requests.post(url, json=payload, headers={"Authorization": f"Bearer {api_key}"}, timeout=15, allow_redirects=False)
    response.raise_for_status()
    result = response.json()
    if not isinstance(result, dict) or str(result.get("status", "")).lower() not in {"success", "200"}:
        raise SMSDeliveryError("ApiTxt rejected the OTP request. Check your API keys, OTP SMS configuration and account balance.")
    return {"mode": "sms", "otp_hash": make_password(otp)}


def check_login_otp(pending, code):
    # Only a locally generated OTP can validate an ApiTxt login challenge.
    return pending.get("mode") == "sms" and check_password(code, pending.get("otp_hash", ""))
