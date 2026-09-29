from django.contrib import admin

from .models import Vendor


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ["id", "vendor_name", "brand_name", "email", "phone", "created_at"]
    search_fields = ["email", "phone", "brand_name", "vendor_name"]
    readonly_fields = ["created_at"]
