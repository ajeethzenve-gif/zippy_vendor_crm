import hashlib
import re
import secrets
import time

import requests
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import transaction
from vendors.account_service import ensure_approved_vendor_account
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from vendors.models import Vendor
from .services.sms_service import SMSConfigurationError, SMSDeliveryError, send_login_otp, check_login_otp


def normalize_phone(value):
    value = str(value or "").strip()
    if not re.fullmatch(r"\+?[\d ()-]+", value):
        return None
    digits = re.sub(r"\D", "", value)
    if len(digits) == 10 and not value.startswith("+"):
        digits = "91" + digits
    if not 10 <= len(digits) <= 15 or digits.startswith("0"):
        return None
    return "+" + digits


def matching_vendor(phone):
    # LIVE remains eligible after the first successful approved login.
    vendors = Vendor.objects.filter(kyc_status="VERIFIED", stage__in=["APPROVED", "LIVE"]).exclude(phone__isnull=True)
    matches = [vendor for vendor in vendors if normalize_phone(vendor.phone) == phone]
    if len(matches) != 1:
        return None
    with transaction.atomic():
        vendor = Vendor.objects.select_for_update().get(pk=matches[0].pk)
        if vendor.kyc_status != "VERIFIED" or vendor.stage not in {"APPROVED", "LIVE"}:
            return None
        # Repair records approved before automatic account provisioning existed.
        if vendor.stage == "APPROVED":
            try:
                with transaction.atomic():
                    ensure_approved_vendor_account(vendor)
            except ValidationError:
                return None
        if not vendor.user_id:
            return None
        user = vendor.user
        if not user.is_active or user.is_staff or user.is_superuser:
            return None
        if not hasattr(user, "user_role") or user.user_role.role.name != "Vendor":
            return None
        return vendor


class OTPThrottle(AnonRateThrottle):
    rate = "10/min"


class VendorOTPSendView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [OTPThrottle]

    def post(self, request):
        phone = normalize_phone(request.data.get("phone"))
        if not phone:
            return Response({"message": "Enter a valid mobile number with country code, or a 10-digit Indian number."}, status=400)
        vendor = matching_vendor(phone)
        if not vendor:
            return Response({"message": "Mobile login requires verified KYC and an approved vendor account. Contact support."}, status=400)
        cooldown = "vendor-otp-send:" + hashlib.sha256(phone.encode()).hexdigest()
        if not cache.add(cooldown, True, timeout=60):
            return Response({"message": "Please wait 60 seconds before requesting another OTP."}, status=429)
        try:
            verification = send_login_otp(phone)
        except (SMSConfigurationError, SMSDeliveryError) as error:
            cache.delete(cooldown)
            return Response({"message": str(error)}, status=503)
        except (requests.RequestException, RuntimeError, ValueError):
            cache.delete(cooldown)
            return Response({"message": "Unable to send OTP. Check the SMS service configuration or try again later."}, status=503)
        challenge = secrets.token_urlsafe(32)
        lifetime = 300
        cache.set("vendor-otp:" + challenge, {"vendor": vendor.pk, "user": vendor.user_id, "phone": phone, **verification, "attempts": 0, "expires": time.time() + lifetime}, timeout=lifetime)
        active_key = "vendor-otp-active:" + hashlib.sha256(phone.encode()).hexdigest()
        previous = cache.get(active_key)
        cache.set(active_key, challenge, timeout=lifetime)
        if previous:
            cache.delete("vendor-otp:" + previous)
        return Response({"message": "OTP sent to your registered mobile number.", "challenge": challenge, "retry_after": 60})


class VendorOTPVerifyView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [OTPThrottle]

    def post(self, request):
        challenge = str(request.data.get("challenge", ""))
        code = str(request.data.get("otp", ""))
        if not re.fullmatch(r"[A-Za-z0-9_-]{40,64}", challenge) or not re.fullmatch(r"\d{4,10}", code):
            return Response({"message": "Enter the OTP sent to your registered number."}, status=400)
        key = "vendor-otp:" + challenge
        lock = key + ":lock"
        if not cache.add(lock, True, timeout=30):
            return Response({"message": "Verification is already in progress. Please wait."}, status=429)
        try:
            pending = cache.get(key)
            if not pending or pending["attempts"] >= 5 or pending["expires"] <= time.time():
                cache.delete(key)
                return Response({"message": "OTP expired or attempt limit reached. Request a new OTP."}, status=400)
            vendor = matching_vendor(pending["phone"])
            if not vendor or vendor.pk != pending["vendor"] or vendor.user_id != pending["user"]:
                cache.delete(key)
                return Response({"message": "Vendor account is unavailable. Contact support."}, status=403)
            pending["attempts"] += 1
            cache.set(key, pending, timeout=max(1, int(pending["expires"] - time.time())))
            try:
                approved = check_login_otp(pending, code)
            except requests.HTTPError as error:
                if error.response is not None and error.response.status_code == 404:
                    cache.delete(key)
                    return Response({"message": "OTP expired. Request a new OTP."}, status=400)
                return Response({"message": "Unable to verify OTP. Please try again."}, status=503)
            except (requests.RequestException, RuntimeError, ValueError):
                return Response({"message": "Unable to verify OTP. Please try again."}, status=503)
            if not approved:
                return Response({"message": "Incorrect OTP. Please try again."}, status=400)
            cache.delete(key)
            with transaction.atomic():
                vendor = Vendor.objects.select_for_update().select_related("user", "user__user_role__role").get(pk=vendor.pk)
                user = vendor.user
                if (vendor.kyc_status != "VERIFIED" or vendor.stage not in {"APPROVED", "LIVE"}
                        or not user or user.pk != pending["user"] or not user.is_active or user.is_staff or user.is_superuser
                        or not hasattr(user, "user_role") or user.user_role.role.name != "Vendor"):
                    return Response({"message": "Vendor account is unavailable. Contact support."}, status=403)
                refresh = RefreshToken.for_user(user)
                vendor.stage = "LIVE"
                vendor.save(update_fields=["stage"])
            return Response({"message": "Login successful", "access": str(refresh.access_token), "refresh": str(refresh), "username": user.username, "email": user.email, "first_name": user.first_name, "last_name": user.last_name, "role": "Vendor", "vendor_id": vendor.pk, "is_staff": user.is_staff, "is_superuser": False})
        finally:
            cache.delete(lock)
