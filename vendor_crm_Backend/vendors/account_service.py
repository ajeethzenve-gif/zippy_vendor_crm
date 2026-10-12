import re
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from accounts.models import Role, UserRole


def ensure_approved_vendor_account(vendor):
    # The caller holds an atomic transaction; lock the persisted approval row.
    locked = type(vendor).objects.select_for_update().get(pk=vendor.pk)
    if locked.stage != "APPROVED" or locked.kyc_status != "VERIFIED":
        return
    users = get_user_model().objects

    def credentials():
        name = re.sub(r"[^\w.-]", "", (locked.vendor_name or "").strip().lower())
        digits = re.sub(r"\D", "", locked.phone or "")
        if not name:
            raise ValidationError({"vendor_name": "A vendor name is required to create login credentials."})
        if len(digits) < 10:
            raise ValidationError({"phone": "A valid mobile number is required to create login credentials."})
        username = name + "@zenvefashion"
        if len(username) > users.model._meta.get_field("username").max_length:
            raise ValidationError({"vendor_name": "Vendor name is too long for a login username."})
        conflicts = users.filter(username__iexact=username)
        if locked.user_id:
            conflicts = conflicts.exclude(pk=locked.user_id)
        if conflicts.exists():
            raise ValidationError({"vendor_name": "This vendor name already belongs to a login account. Use a unique name."})
        return username, name + "@zf" + digits[-6:]

    if locked.user_id:
        user = users.select_for_update().get(pk=locked.user_id)
        if user.is_staff or user.is_superuser:
            raise ValidationError("A staff account cannot be reassigned as a vendor login.")
        if not user.has_usable_password():
            user.username, password = credentials()
            user.set_password(password)
            user.save(update_fields=["username", "password"])
    else:
        email = (locked.email or "").strip().lower()
        if email and users.filter(email__iexact=email).exists():
            raise ValidationError({"email": "This email already belongs to a login account. Link the correct vendor account before approving."})
        username, password = credentials()
        user = users.create_user(username=username, email=email, first_name=locked.vendor_name[:150], password=password)
        type(vendor).objects.filter(pk=locked.pk).update(user=user)
    role, _ = Role.objects.get_or_create(name="Vendor")
    UserRole.objects.update_or_create(user=user, defaults={"role": role})
    vendor.user = user
