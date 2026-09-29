import uuid
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from .models import Order, ReturnRequest, Settlement
from .serializers import OrderSerializer, ReturnRequestSerializer, SettlementSerializer


class OrderListCreateAPIView(APIView):
    """
    GET  /api/orders/ (supports ?status=STATUS, ?search=QUERY)
    POST /api/orders/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        status_filter = request.query_params.get("status")
        search = request.query_params.get("search")

        orders = Order.objects.all().prefetch_related("items").order_by("-created_at")

        if status_filter:
            sf = status_filter.strip()
            status_map = {
                "PLACED": "Pending",
                "CONFIRMED": "Confirmed",
                "PACKED": "Processing",
                "PROCESSING": "Processing",
                "SHIPPED": "Shipped",
                "OUT_FOR_DELIVERY": "Out for Delivery",
                "DELIVERED": "Delivered",
                "CANCELLED": "Cancelled",
                "RETURNED": "Returned",
            }
            mapped = status_map.get(sf.upper(), sf)
            orders = orders.filter(
                Q(order_status__iexact=sf) | Q(order_status__iexact=mapped)
            )

        if search:
            query = search.strip()
            orders = orders.filter(
                Q(order_number__icontains=query) |
                Q(shipping_full_name__icontains=query) |
                Q(shipping_phone__icontains=query) |
                Q(shipping_email__icontains=query) |
                Q(shipping_postal_code__icontains=query) |
                Q(shipping_city__icontains=query) |
                Q(items__product_name__icontains=query)
            ).distinct()

        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = OrderSerializer(data=request.data)
        if serializer.is_valid():
            order = serializer.save()
            return Response(
                OrderSerializer(order).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OrderDetailAPIView(APIView):
    """
    GET    /api/orders/<id>/
    PATCH  /api/orders/<id>/
    DELETE /api/orders/<id>/
    """
    permission_classes = [AllowAny]

    def get_object(self, pk):
        try:
            return Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return None

    def get(self, request, pk):
        order = self.get_object(pk)
        if not order:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        order = self.get_object(pk)
        if not order:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = OrderSerializer(order, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(OrderSerializer(updated).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        order = self.get_object(pk)
        if not order:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        order.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrderStatsAPIView(APIView):
    """
    GET /api/orders/stats/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        total_orders = Order.objects.count()
        open_orders = Order.objects.exclude(
            order_status__in=["Delivered", "DELIVERED", "Cancelled", "CANCELLED", "Returned", "RETURNED"]
        ).count()
        delivered_orders = Order.objects.filter(
            order_status__in=["Delivered", "DELIVERED"]
        ).count()

        gmv_agg = Order.objects.exclude(
            order_status__in=["Cancelled", "CANCELLED"]
        ).aggregate(total=Sum("total"))
        gmv = gmv_agg["total"] or Decimal("0.00")

        return Response({
            "total_orders": total_orders,
            "open_orders": open_orders,
            "delivered_orders": delivered_orders,
            "gmv": float(gmv),
        }, status=status.HTTP_200_OK)


class OrderTransitionAPIView(APIView):
    """
    POST /api/orders/<id>/transition/
    Body: {"status": "Confirmed"|"Processing"|"Shipped"|"Out for Delivery"|"Delivered"|"Cancelled"}
    Or no body to advance to the next step.
    """
    permission_classes = [AllowAny]

    LIFECYCLE_SEQUENCE = [
        "Pending",
        "Confirmed",
        "Processing",
        "Shipped",
        "Out for Delivery",
        "Delivered",
    ]

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        target_status = request.data.get("status") or request.data.get("order_status")

        status_map = {
            "PLACED": "Pending",
            "CONFIRMED": "Confirmed",
            "PACKED": "Processing",
            "PROCESSING": "Processing",
            "SHIPPED": "Shipped",
            "OUT_FOR_DELIVERY": "Out for Delivery",
            "DELIVERED": "Delivered",
            "CANCELLED": "Cancelled",
            "RETURNED": "Returned",
        }

        if target_status:
            target_status = status_map.get(str(target_status).strip().upper(), str(target_status).strip())

        if not target_status:
            # Advance to next sequence
            curr_status = status_map.get(str(order.order_status).strip().upper(), str(order.order_status).strip())
            try:
                curr_idx = self.LIFECYCLE_SEQUENCE.index(curr_status)
                if curr_idx < len(self.LIFECYCLE_SEQUENCE) - 1:
                    target_status = self.LIFECYCLE_SEQUENCE[curr_idx + 1]
                else:
                    return Response({"detail": "Order is already at final state."}, status=status.HTTP_400_BAD_REQUEST)
            except ValueError:
                return Response({"detail": f"Order status {order.order_status} cannot be auto-advanced."}, status=status.HTTP_400_BAD_REQUEST)

        # Validation for cancellation: can only cancel before dispatch
        if target_status == "Cancelled" and not order.can_cancel:
            return Response({
                "detail": "Order cannot be cancelled after dispatch/shipping."
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = OrderSerializer(order, data={"order_status": target_status, "status": target_status}, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(OrderSerializer(updated).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReturnListCreateAPIView(APIView):
    """
    GET  /api/orders/returns/ (supports ?status=STATUS, ?search=QUERY, ?order_id=ID)
    POST /api/orders/returns/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        status_filter = request.query_params.get("status")
        search = request.query_params.get("search")
        order_id = request.query_params.get("order_id")

        returns = ReturnRequest.objects.all().select_related("order", "order_item").order_by("-created_at")

        if status_filter:
            returns = returns.filter(status__iexact=status_filter.strip())

        if order_id:
            returns = returns.filter(order_id=order_id)

        if search:
            query = search.strip()
            returns = returns.filter(
                Q(return_number__icontains=query) |
                Q(order__order_number__icontains=query) |
                Q(order__customer_name__icontains=query) |
                Q(order_item__product_name__icontains=query) |
                Q(order_item__sku__icontains=query)
            ).distinct()

        serializer = ReturnRequestSerializer(returns, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ReturnRequestSerializer(data=request.data)
        if serializer.is_valid():
            return_req = serializer.save()
            return Response(
                ReturnRequestSerializer(return_req).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReturnDetailAPIView(APIView):
    """
    GET    /api/orders/returns/<id>/
    PATCH  /api/orders/returns/<id>/
    DELETE /api/orders/returns/<id>/
    """
    permission_classes = [AllowAny]

    def get_object(self, pk):
        try:
            return ReturnRequest.objects.get(pk=pk)
        except ReturnRequest.DoesNotExist:
            return None

    def get(self, request, pk):
        return_req = self.get_object(pk)
        if not return_req:
            return Response({"detail": "Return request not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ReturnRequestSerializer(return_req).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        return_req = self.get_object(pk)
        if not return_req:
            return Response({"detail": "Return request not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ReturnRequestSerializer(return_req, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(ReturnRequestSerializer(updated).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        return_req = self.get_object(pk)
        if not return_req:
            return Response({"detail": "Return request not found."}, status=status.HTTP_404_NOT_FOUND)
        return_req.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReturnStatsAPIView(APIView):
    """
    GET /api/orders/returns/stats/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        total_returns = ReturnRequest.objects.count()

        open_returns = ReturnRequest.objects.filter(
            status__in=[
                ReturnRequest.ReturnStatus.REQUESTED,
                ReturnRequest.ReturnStatus.PICKUP_SCHEDULED,
                ReturnRequest.ReturnStatus.RECEIVED,
            ]
        ).count()

        awaiting_inspection = ReturnRequest.objects.filter(
            status=ReturnRequest.ReturnStatus.RECEIVED
        ).count()

        failed_qc = ReturnRequest.objects.filter(
            status=ReturnRequest.ReturnStatus.INSPECTED_FAILED
        ).count()

        refund_agg = ReturnRequest.objects.filter(
            status=ReturnRequest.ReturnStatus.REFUNDED
        ).aggregate(total=Sum("refund_amount"))
        refund_values = refund_agg["total"] or Decimal("0.00")

        return Response({
            "total_returns": total_returns,
            "open_returns": open_returns,
            "awaiting_inspection": awaiting_inspection,
            "failed_qc": failed_qc,
            "refund_values": float(refund_values),
        }, status=status.HTTP_200_OK)


class ReturnTransitionAPIView(APIView):
    """
    POST /api/orders/returns/<id>/transition/
    Body: {"status": "PICKUP_SCHEDULED"|"RECEIVED"|"INSPECTED_PASSED"|"INSPECTED_FAILED"|"REFUNDED"|"REJECTED", "inspection_notes": "..."}
    """
    permission_classes = [AllowAny]

    DEFAULT_SEQUENCE = [
        ReturnRequest.ReturnStatus.REQUESTED,
        ReturnRequest.ReturnStatus.PICKUP_SCHEDULED,
        ReturnRequest.ReturnStatus.RECEIVED,
        ReturnRequest.ReturnStatus.INSPECTED_PASSED,
        ReturnRequest.ReturnStatus.REFUNDED,
    ]

    def post(self, request, pk):
        try:
            return_req = ReturnRequest.objects.get(pk=pk)
        except ReturnRequest.DoesNotExist:
            return Response({"detail": "Return request not found."}, status=status.HTTP_404_NOT_FOUND)

        target_status = request.data.get("status")
        notes = request.data.get("inspection_notes") or request.data.get("notes")

        if target_status:
            target_status = str(target_status).strip().upper()
            if target_status == "PASSED":
                target_status = ReturnRequest.ReturnStatus.INSPECTED_PASSED
            elif target_status == "FAILED":
                target_status = ReturnRequest.ReturnStatus.INSPECTED_FAILED

        if not target_status:
            if return_req.status == ReturnRequest.ReturnStatus.REQUESTED:
                target_status = ReturnRequest.ReturnStatus.PICKUP_SCHEDULED
            elif return_req.status == ReturnRequest.ReturnStatus.PICKUP_SCHEDULED:
                target_status = ReturnRequest.ReturnStatus.RECEIVED
            elif return_req.status in [
                ReturnRequest.ReturnStatus.INSPECTED_PASSED,
                ReturnRequest.ReturnStatus.INSPECTED_FAILED,
            ]:
                target_status = ReturnRequest.ReturnStatus.REFUNDED
            elif return_req.status == ReturnRequest.ReturnStatus.RECEIVED:
                target_status = ReturnRequest.ReturnStatus.INSPECTED_PASSED
            elif return_req.status == ReturnRequest.ReturnStatus.REFUNDED:
                return Response({"detail": "Return is already refunded (closed)."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({"detail": f"Return status {return_req.status} cannot be auto-advanced."}, status=status.HTTP_400_BAD_REQUEST)

        update_data = {"status": target_status}
        if notes:
            update_data["inspection_notes"] = notes

        serializer = ReturnRequestSerializer(return_req, data=update_data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(ReturnRequestSerializer(updated).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SettlementListCreateAPIView(APIView):
    """
    GET  /api/settlements/ (supports ?status=STATUS, ?designer_id=ID, ?is_reversal=true/false, ?search=QUERY)
    POST /api/settlements/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        status_filter = request.query_params.get("status")
        designer_id = request.query_params.get("designer_id")
        is_reversal = request.query_params.get("is_reversal")
        search = request.query_params.get("search")

        settlements = Settlement.objects.all().select_related("order", "order_item", "designer", "return_request").order_by("-created_at")

        if status_filter:
            settlements = settlements.filter(status__iexact=status_filter.strip())

        if designer_id:
            settlements = settlements.filter(designer_id=designer_id)

        if is_reversal is not None:
            val = is_reversal.lower() in ["true", "1"]
            settlements = settlements.filter(is_reversal=val)

        if search:
            query = search.strip()
            settlements = settlements.filter(
                Q(settlement_number__icontains=query) |
                Q(order__order_number__icontains=query) |
                Q(designer__brand_name__icontains=query) |
                Q(designer__vendor_code__icontains=query) |
                Q(order_item__product_name__icontains=query) |
                Q(order_item__sku__icontains=query) |
                Q(payout_reference__icontains=query)
            ).distinct()

        serializer = SettlementSerializer(settlements, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = SettlementSerializer(data=request.data)
        if serializer.is_valid():
            settlement = serializer.save()
            return Response(
                SettlementSerializer(settlement).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SettlementDetailAPIView(APIView):
    """
    GET    /api/settlements/<id>/
    PATCH  /api/settlements/<id>/
    DELETE /api/settlements/<id>/
    """
    permission_classes = [AllowAny]

    def get_object(self, pk):
        try:
            return Settlement.objects.get(pk=pk)
        except Settlement.DoesNotExist:
            return None

    def get(self, request, pk):
        settlement = self.get_object(pk)
        if not settlement:
            return Response({"detail": "Settlement not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(SettlementSerializer(settlement).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        settlement = self.get_object(pk)
        if not settlement:
            return Response({"detail": "Settlement not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = SettlementSerializer(settlement, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(SettlementSerializer(updated).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        settlement = self.get_object(pk)
        if not settlement:
            return Response({"detail": "Settlement not found."}, status=status.HTTP_404_NOT_FOUND)
        settlement.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SettlementStatsAPIView(APIView):
    """
    GET /api/settlements/stats/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        regular_settlements = Settlement.objects.filter(is_reversal=False)
        reversal_settlements = Settlement.objects.filter(is_reversal=True)

        regular_gmv = regular_settlements.aggregate(total=Sum("gmv"))["total"] or Decimal("0.00")
        reversed_gmv = reversal_settlements.aggregate(total=Sum("gmv"))["total"] or Decimal("0.00")
        reversal_abs_amount = abs(reversed_gmv)

        net_settled_gmv = regular_gmv + reversed_gmv

        commission_regular = regular_settlements.aggregate(total=Sum("commission_amount"))["total"] or Decimal("0.00")
        commission_reversed = reversal_settlements.aggregate(total=Sum("commission_amount"))["total"] or Decimal("0.00")
        zenve_commission = commission_regular + commission_reversed

        payable_agg = regular_settlements.filter(
            status__in=[Settlement.SettlementStatus.PENDING, Settlement.SettlementStatus.APPROVED]
        ).aggregate(total=Sum("payout_amount"))["total"] or Decimal("0.00")

        reversal_unpaid = reversal_settlements.aggregate(total=Sum("payout_amount"))["total"] or Decimal("0.00")
        payable_to_designers = max(Decimal("0.00"), payable_agg + reversal_unpaid)

        paid_agg = regular_settlements.filter(
            status__in=[Settlement.SettlementStatus.PAID, Settlement.SettlementStatus.RECONCILED]
        ).aggregate(total=Sum("payout_amount"))["total"] or Decimal("0.00")

        reversed_count = reversal_settlements.count()
        total_settlements = regular_settlements.count()

        return Response({
            "settled_gmv": float(net_settled_gmv),
            "gross_gmv": float(regular_gmv),
            "settlements_count": total_settlements,
            "zenve_commission": float(zenve_commission),
            "payable_to_designers": float(payable_to_designers),
            "paid_to_designers": float(paid_agg),
            "reversed_by_returns": reversed_count,
            "reversal_amount": float(reversal_abs_amount),
        }, status=status.HTTP_200_OK)


class SettlementTransitionAPIView(APIView):
    """
    POST /api/settlements/<id>/transition/
    Body: {"status": "APPROVED" | "PAID" | "RECONCILED", "payout_reference": "UTR-12345", "notes": "..."}
    """
    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            settlement = Settlement.objects.get(pk=pk)
        except Settlement.DoesNotExist:
            return Response({"detail": "Settlement not found."}, status=status.HTTP_404_NOT_FOUND)

        target_status = request.data.get("status")
        payout_ref = request.data.get("payout_reference")
        notes = request.data.get("notes")

        if not target_status:
            seq = [
                Settlement.SettlementStatus.PENDING,
                Settlement.SettlementStatus.APPROVED,
                Settlement.SettlementStatus.PAID,
                Settlement.SettlementStatus.RECONCILED,
            ]
            try:
                curr_idx = seq.index(settlement.status)
                if curr_idx < len(seq) - 1:
                    target_status = seq[curr_idx + 1]
                else:
                    return Response({"detail": "Settlement is already reconciled."}, status=status.HTTP_400_BAD_REQUEST)
            except ValueError:
                return Response({"detail": f"Status {settlement.status} cannot be auto-advanced."}, status=status.HTTP_400_BAD_REQUEST)

        update_data = {"status": target_status}
        if payout_ref:
            update_data["payout_reference"] = payout_ref
        if notes:
            update_data["notes"] = notes

        if target_status == Settlement.SettlementStatus.PAID and not settlement.paid_at:
            update_data["paid_at"] = timezone.now()
            if not update_data.get("payout_reference") and not settlement.payout_reference:
                update_data["payout_reference"] = f"UTR-{uuid.uuid4().hex[:10].upper()}"

        if target_status == Settlement.SettlementStatus.RECONCILED and not settlement.reconciled_at:
            update_data["reconciled_at"] = timezone.now()

        serializer = SettlementSerializer(settlement, data=update_data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(SettlementSerializer(updated).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SettlementGenerateAPIView(APIView):
    """
    POST /api/settlements/generate/
    Syncs delivered orders and refunded returns to ensure complete ledger entries.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from vendors.models import Vendor as Designer

        delivered_orders = Order.objects.filter(order_status__in=["Delivered", "DELIVERED"]).prefetch_related("items")
        created_settlements = 0
        created_reversals = 0

        for order in delivered_orders:
            for item in order.items.all():
                if not item.settlements.filter(is_reversal=False).exists():
                    designer = item.product.designer if (item.product and item.product.designer) else None
                    if designer:
                        take_rate = designer.take_rate
                        gmv = item.total
                        commission = (gmv * take_rate) / Decimal("100")
                        payout = gmv - commission
                        Settlement.objects.create(
                            order=order,
                            order_item=item,
                            designer=designer,
                            gmv=gmv,
                            take_rate=take_rate,
                            commission_amount=commission,
                            payout_amount=payout,
                            status=Settlement.SettlementStatus.PENDING,
                        )
                        created_settlements += 1

        refunded_returns = ReturnRequest.objects.filter(status=ReturnRequest.ReturnStatus.REFUNDED).select_related("order", "order_item")
        for rtn in refunded_returns:
            if not rtn.reversal_settlements.exists():
                product = rtn.order_item.product if rtn.order_item else None
                designer = (product.designer if (product and product.designer) else None)
                if designer:
                    take_rate = designer.take_rate
                    refund_gmv = rtn.refund_amount
                    commission_rev = (refund_gmv * take_rate) / Decimal("100")
                    payout_deduction = refund_gmv - commission_rev
                    reason_text = rtn.get_reason_display() if hasattr(rtn, 'get_reason_display') else rtn.reason
                    Settlement.objects.create(
                        order=rtn.order,
                        order_item=rtn.order_item,
                        designer=designer,
                        return_request=rtn,
                        is_reversal=True,
                        gmv=-refund_gmv,
                        take_rate=take_rate,
                        commission_amount=-commission_rev,
                        payout_amount=-payout_deduction,
                        status=Settlement.SettlementStatus.REVERSED,
                        notes=f"Reversal for Return #{rtn.return_number} ({reason_text})"
                    )
                    created_reversals += 1

        return Response({
            "created_settlements": created_settlements,
            "created_reversals": created_reversals,
            "message": f"Settlement ledger synchronized: {created_settlements} settlements and {created_reversals} reversals generated."
        }, status=status.HTTP_200_OK)

