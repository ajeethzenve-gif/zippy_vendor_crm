"""Provider adapter boundary. Configure only after the chosen provider is integrated."""
from django.conf import settings
from django.utils.module_loading import import_string


class VerificationUnavailable(Exception):
    pass


def verify_identifiers(gst_number, pan_number, pan_name="", pan_dob=None):
    adapter_path = getattr(settings, "VENDOR_KYC_ADAPTER", "")
    if not adapter_path:
        raise VerificationUnavailable("GST/PAN verification provider is not configured. Ask an administrator to connect the provider.")
    try:
        result = import_string(adapter_path)(gst_number=gst_number, pan_number=pan_number, pan_name=pan_name, pan_dob=pan_dob)
        if not isinstance(result, dict) or any(result.get(key) not in {"VERIFIED", "PENDING", "REJECTED"} for key in ["gst_status", "pan_status"]):
            raise ValueError("Invalid provider result")
        if not str(result.get("reference", "")).strip():
            raise ValueError("Missing provider reference")
        return result
    except VerificationUnavailable:
        raise
    except Exception as error:
        raise VerificationUnavailable("The verification provider could not complete this check. Please try again later.") from error
