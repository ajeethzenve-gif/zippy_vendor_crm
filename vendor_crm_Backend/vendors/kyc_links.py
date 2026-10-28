from datetime import timedelta
from django.core import signing
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

SALT = "vendors.pan-submission.v1"
LINK_LIFETIME = timedelta(hours=48)


def issue_token(row):
    return signing.dumps({"vendor": row.vendor_id, "requested_at": row.requested_at.isoformat()}, salt=SALT)


def read_token(token):
    try:
        data = signing.loads(token, salt=SALT, max_age=LINK_LIFETIME.total_seconds())
        if not isinstance(data, dict) or not isinstance(data.get("vendor"), int) or not data.get("requested_at"):
            raise ValueError
        return data
    except (signing.BadSignature, ValueError, TypeError):
        raise PermissionDenied("This KYC link is invalid or expired. Ask your account team for a new link.")


def validate_request(row, data):
    if (not row or row.status != "REQUESTED" or row.requested_at.isoformat() != data["requested_at"]
            or timezone.now() >= row.requested_at + LINK_LIFETIME):
        raise PermissionDenied("This KYC link has expired, was replaced, or has already been used. Ask your account team for a new link.")
