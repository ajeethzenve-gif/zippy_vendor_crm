from uuid import uuid4
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from accounts.models import Role, UserRole


def ensure_approved_vendor_account(vendor):
    # The caller holds an atomic transaction; lock the persisted approval row.
    locked = type(vendor).objects.select_for_update().get(pk=vendor.pk)
    if locked.stage != "APPROVED" or locked.kyc_status != "VERIFIED":
        return
    users = get_user_model().objects
    if locked.user_id:
        user = users.select_for_update().get(pk=locked.user_id)
        if user.is_staff or user.is_superuser:
            raise ValidationError("A staff account cannot be reassigned as a vendor login.")
    else:
        email = (locked.email or "").strip().lower()
        if email and users.filter(email__iexact=email).exists():
            raise ValidationError({"email": "This email already belongs to a login account. Link the correct vendor account before approving."})
        username = "vendor_" + locked.vendor_code
        if users.filter(username=username).exists():
            username = "vendor_" + uuid4().hex
        user = users.create_user(username=username, email=email, first_name=locked.vendor_name[:150], password=None)
        type(vendor).objects.filter(pk=locked.pk).update(user=user)
    role, _ = Role.objects.get_or_create(name="Vendor")
    UserRole.objects.update_or_create(user=user, defaults={"role": role})
    vendor.user = user
