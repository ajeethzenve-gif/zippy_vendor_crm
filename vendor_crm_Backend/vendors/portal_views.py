"""Vendor portal payloads backed by vendor-owned products, orders and settlements."""
from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Vendor, VendorAccountDetails
from .serializers import VendorSerializer, VendorAccountSerializer
from credits.views import get_designer_credits_data
from products.serializers import ProductSerializer
from orders.models import OrderItem, ReturnRequest
from orders.serializers import SettlementSerializer


def is_portal_admin(user):
    assigned_role = getattr(getattr(user, "user_role", None), "role", None)
    return bool(user.is_superuser or (assigned_role and assigned_role.name == "Admin") or (user.is_staff and assigned_role is None))


def portal_vendor(request, pk):
    vendor = get_object_or_404(Vendor, pk=pk)
    if not is_portal_admin(request.user) and vendor.user_id != request.user.pk:
        raise PermissionDenied("You cannot access this vendor's portal.")
    return vendor


class VendorPortalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        vendor = portal_vendor(request, pk)
        products = vendor.products.all().select_related("designer").prefetch_related("size_stocks", "product_images")
        product_ids = [str(p.pk) for p in products]
        items = OrderItem.objects.filter(product_id__in=product_ids).select_related("order")
        sales = items.exclude(order__order_status__in=["Cancelled", "Returned"])
        settlements = vendor.settlements.all().select_related("order", "order_item", "designer", "return_request")
        paid = settlements.filter(status__in=["PAID", "RECONCILED"])
        returns = ReturnRequest.objects.filter(order_item__product_id__in=product_ids)
        units = sales.aggregate(value=Sum("quantity"))["value"] or 0
        best = sales.values("product_name").annotate(units=Sum("quantity")).order_by("-units").first()
        order_rows = {}
        for item in items:
            row = order_rows.setdefault(item.order_id, {"id": item.order.order_number, "customer": item.order.customer_name, "amount": 0, "status": item.order.order_status})
            row["amount"] += float(item.total)
        notifications = []
        for product in products:
            if product.status in ["APPROVED", "LIVE", "REJECTED", "CORRECTION"]:
                changed = product.updated_at
                notifications.append({"id": f"product-{product.pk}", "message": f"{product.product_name}: {product.get_status_display()}", "kind": "CATALOGUE", "read": bool(vendor.notifications_read_at and changed <= vendor.notifications_read_at), "created_at": changed})
        details = VendorSerializer(vendor, context={"request": request}).data
        details.update(brand=vendor.brand_name, name=vendor.vendor_name, gst=vendor.gst_number)
        now = timezone.now()
        total_orders = items.values("order_id").distinct().count()
        pending = []
        if vendor.kyc_status != "VERIFIED":
            pending.append("Complete KYC verification.")
        if not vendor.contract_signed:
            pending.append("Your vendor contract is awaiting signature.")
        return Response({
            "vendor": details, "designer": details,
            "can_manage_account": bool(request.user.is_authenticated and (
                is_portal_admin(request.user) or vendor.user_id == request.user.pk
            )),
            "kpis": {
                "monthlyGmv": sales.filter(order__created_at__year=now.year, order__created_at__month=now.month).aggregate(value=Sum("total"))["value"] or 0,
                "orders": total_orders, "units": units,
                "commission": settlements.aggregate(value=Sum("commission_amount"))["value"] or 0,
                "netPayable": settlements.exclude(status__in=["PAID", "RECONCILED"]).aggregate(value=Sum("payout_amount"))["value"] or 0,
                "paid": paid.aggregate(value=Sum("payout_amount"))["value"] or 0,
                "bestSeller": {"name": best["product_name"], "units": best["units"]} if best else None,
                "returns": returns.count(), "returnRate": round(returns.values("order_id").distinct().count() / total_orders * 100, 2) if total_orders else 0,
                "liveSkus": sum(p.is_live for p in products), "totalSkus": len(products),
                "inventoryAlerts": sum(p.available_quantity <= p.low_stock_threshold for p in products),
            },
            "pendingActions": pending, "notifications": notifications,
            "skus": ProductSerializer(products, many=True, context={"request": request}).data,
            "orders": list(order_rows.values()),
            "settlements": SettlementSerializer(settlements, many=True).data,
            "credits": get_designer_credits_data(vendor),
        })


class VendorNotificationsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        vendor = portal_vendor(request, pk)
        vendor.notifications_read_at = timezone.now()
        vendor.save(update_fields=["notifications_read_at"])
        return Response({"detail": "Notifications marked as read."})


class VendorAccountView(APIView):
    # Banking details require a real server-authenticated owner or staff member.
    permission_classes = [IsAuthenticated]

    def get_vendor(self, request, pk):
        vendor = get_object_or_404(Vendor, pk=pk)
        if not is_portal_admin(request.user) and vendor.user_id != request.user.pk:
            raise PermissionDenied("You cannot access this vendor's bank account.")
        return vendor

    def get(self, request, pk):
        vendor = self.get_vendor(request, pk)
        account = VendorAccountDetails.objects.filter(vendor=vendor).first()
        return Response({"exists": account is not None, "data": VendorAccountSerializer(account).data if account else None})

    @transaction.atomic
    def post(self, request, pk):
        vendor = self.get_vendor(request, pk)
        Vendor.objects.select_for_update().get(pk=vendor.pk)
        account = VendorAccountDetails.objects.filter(vendor=vendor).first()
        serializer = VendorAccountSerializer(account, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(vendor=vendor)
        return Response({"exists": True, "data": serializer.data}, status=200 if account else 201)
