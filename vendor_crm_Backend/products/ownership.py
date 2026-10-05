def request_vendor_id(request):
    user = request.user
    if not user.is_authenticated or user.is_superuser:
        return None
    role = getattr(getattr(user, "user_role", None), "role", None)
    vendor = getattr(user, "vendor", None)
    if (role and role.name == "Vendor") or (role is None and vendor is not None):
        return vendor.pk if vendor else 0
    return None


def vendor_products(queryset, request):
    vendor_id = request_vendor_id(request)
    return queryset.filter(designer_id=vendor_id) if vendor_id is not None else queryset
