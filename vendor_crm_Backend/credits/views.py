from django.db import models
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from .models import (
    OfflineFashionCredit,
    OnlineFashionCredit,
    DesignerCreditWallet,
    DesignerCreditStatement,
)
from .serializers import (
    OfflineFashionCreditSerializer,
    OnlineFashionCreditSerializer,
    DesignerCreditWalletSerializer,
    DesignerCreditStatementSerializer,
)
from vendors.models import Vendor as Designer


def get_or_create_designer_wallet(designer):
    """Retrieve or create the designer credit wallet with genuine database values."""
    from products.models import Product

    # Calculate actual catalogue listings count & statement deductions
    designer_skus = Product.objects.filter(designer=designer)
    actual_listings_count = designer_skus.filter(status__in=["APPROVED", "LIVE", "PENDING_QA"]).count()
    statement_deductions = abs(sum(
        s.points for s in DesignerCreditStatement.objects.filter(designer=designer, channel="ONLINE", points__lt=0)
    ))
    actual_points_used = max(actual_listings_count * 500, statement_deductions)

    # Determine allocated online credits based on plan or designer credit_points
    allocated_credits = designer.credit_points or 0
    if not allocated_credits and designer.online_membership_plan:
        from .models import OnlineVendorCredit
        plan_obj = OnlineVendorCredit.objects.filter(
            code__iexact=designer.online_membership_plan
        ).first()
        if plan_obj:
            allocated_credits = plan_obj.credit_points

    # Current remaining online credits
    current_online_credits = max(0, allocated_credits - actual_points_used)

    wallet, created = DesignerCreditWallet.objects.get_or_create(
        designer=designer,
        defaults={
            "online_credits": current_online_credits,
            "points_used": actual_points_used,
            "online_plan": (designer.online_membership_plan or "").title() or "—",
        },
    )

    # ALWAYS sync wallet points and plans with live Designer fields in the database
    updated = False

    # Sync Online Credits & Plan
    expected_online = max(0, allocated_credits - actual_points_used)
    if wallet.online_credits != expected_online:
        wallet.online_credits = expected_online
        updated = True

    if wallet.points_used != actual_points_used:
        wallet.points_used = actual_points_used
        updated = True

    online_plan_title = (designer.online_membership_plan or "").title() or "—"
    if wallet.online_plan != online_plan_title:
        wallet.online_plan = online_plan_title
        updated = True

    if updated:
        wallet.save()

    return wallet


def get_designer_credits_data(designer):
    """Build the comprehensive credits payload using only real database records."""
    from products.models import Product

    wallet = get_or_create_designer_wallet(designer)
    statements = wallet.statements.filter(channel="ONLINE").order_by("-id")

    # Compute daily point burn dynamically based strictly on designer products
    designer_skus = Product.objects.filter(designer=designer)
    online_count = designer_skus.filter(is_live=True).count()
    store_count = designer_skus.filter(
        models.Q(fulfilment_location__icontains="STORE") |
        models.Q(sales_channel__in=["OFFLINE", "BOTH"])
    ).count()

    online_burn = online_count * 3
    store_burn = store_count * 5
    total_burn = online_burn

    add_ons_deductions = abs(sum(
        s.points for s in statements.filter(points__lte=-5000)
    ))
    listings_charged_count = (wallet.points_used - add_ons_deductions) // 500 if wallet.points_used >= add_ons_deductions else 0
    if add_ons_deductions > 0:
        points_used_subtitle = f"{wallet.points_used:,} pts used across catalogue & add-ons"
    elif listings_charged_count > 0:
        points_used_subtitle = f"{listings_charged_count} catalogue listing(s) at 500 pts each"
    else:
        points_used_subtitle = "0 points used"

    return {
        "wallet": {
            "online_credits": wallet.online_credits,
            "points_used": wallet.points_used,
            "total_balance": wallet.online_credits,
            "online_plan": wallet.online_plan or "—",
            "online_listings_left": wallet.online_credits // 500,
            "points_used_subtitle": points_used_subtitle,
        },
        "daily_burn": {
            "online_count": online_count,
            "online_pts_each": 3,
            "online_subtotal": online_burn,
            "store_count": store_count,
            "store_pts_each": 5,
            "store_subtotal": store_burn,
            "total_burn_per_day": total_burn,
            "rates_text": "Catalogue listing 500 pts · Exclusive video & photo shoot 5,000 pts · Exclusive social media promotion 5,000 pts",
        },
        "statements": DesignerCreditStatementSerializer(statements, many=True).data,
    }


class OfflineFashionListAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request, format=None):
        offline_fashion_list = (
            OfflineFashionCredit.objects
            .filter(is_active=True)
            .order_by("id")
        )
        serializer = OfflineFashionCreditSerializer(
            offline_fashion_list,
            many=True,
        )
        return Response(
            {"offlinefashionlist": serializer.data},
            status=status.HTTP_200_OK,
        )


class DesignerCreditsAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, designer_id):
        try:
            designer = Designer.objects.get(id=designer_id)
        except Designer.DoesNotExist:
            return Response(
                {"detail": "Designer not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = get_designer_credits_data(designer)
        return Response(data, status=status.HTTP_200_OK)


class BuyOfflineCreditPackAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return Response({"detail": "Vendors use online credits only. Offline packs are unavailable."}, status=status.HTTP_400_BAD_REQUEST)

class OnlineVendorCreditListAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from .models import OnlineVendorCredit
        from .serializers import OnlineVendorCreditSerializer
        plans = OnlineVendorCredit.objects.filter(is_active=True)
        return Response(OnlineVendorCreditSerializer(plans, many=True).data)
