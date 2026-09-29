from django.contrib import admin
from .models import OnlineVendorCredit


@admin.register(OnlineVendorCredit)
class OnlineVendorCreditAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "credit_points", "sku_limit", "is_active", "sort_order"]
    list_filter = ["is_active"]
    search_fields = ["name", "code"]
    readonly_fields = ["created_at", "updated_at"]
