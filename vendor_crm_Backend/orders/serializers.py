from decimal import Decimal
from rest_framework import serializers
from .models import Order, OrderItem, ReturnRequest, Settlement
from products.models import Product


class OrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.CharField(required=False, allow_blank=True, default="")
    sku = serializers.CharField(read_only=True)
    brand_name = serializers.CharField(read_only=True)
    colour = serializers.CharField(source="color", required=False, allow_blank=True)
    unit_price = serializers.DecimalField(source="price", max_digits=12, decimal_places=2, required=False)
    total_price = serializers.DecimalField(source="total", max_digits=12, decimal_places=2, read_only=True)
    return_policy = serializers.SerializerMethodField()
    is_returnable = serializers.SerializerMethodField()
    returned_units = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_id",
            "product_name",
            "product_image",
            "product_data",
            "quantity",
            "price",
            "total",
            "size",
            "color",
            "colour",
            "sku",
            "brand_name",
            "unit_price",
            "total_price",
            "created_at",
            "return_policy",
            "is_returnable",
            "returned_units",
        ]
        read_only_fields = ["id", "total", "total_price", "created_at", "return_policy", "is_returnable", "returned_units"]

    def get_return_policy(self, obj):
        if obj.product:
            return getattr(obj.product, "return_policy", "RETURNABLE")
        return "RETURNABLE"

    def get_returned_units(self, obj):
        active_returns = obj.returns.exclude(status=ReturnRequest.ReturnStatus.REJECTED)
        return sum(r.quantity for r in active_returns)

    def get_is_returnable(self, obj):
        policy = self.get_return_policy(obj)
        if policy != "RETURNABLE":
            return False
        if obj.order.order_status not in [Order.OrderStatus.DELIVERED, "Delivered", "DELIVERED"]:
            return False
        return self.get_returned_units(obj) < obj.quantity


class OrderSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(required=False, allow_blank=True)
    items = OrderItemSerializer(many=True, required=False)
    is_open = serializers.ReadOnlyField()
    can_cancel = serializers.ReadOnlyField()

    # Backwards-compatibility read/write mappings
    status = serializers.CharField(source="order_status", required=False)
    total_amount = serializers.DecimalField(source="total", max_digits=12, decimal_places=2, required=False)
    customer_name = serializers.CharField(source="shipping_full_name", required=False, allow_blank=True)
    customer_phone = serializers.CharField(source="shipping_phone", required=False, allow_blank=True)
    customer_email = serializers.CharField(source="shipping_email", required=False, allow_blank=True, allow_null=True)
    delivery_pincode = serializers.CharField(source="shipping_postal_code", required=False, allow_blank=True)
    delivery_address = serializers.ReadOnlyField()
    is_fast_delivery = serializers.ReadOnlyField()

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "user_id_string",
            "order_number",
            "subtotal",
            "discount",
            "shipping",
            "total",
            "total_amount",
            "payment_status",
            "payment_method",
            "order_status",
            "status",
            "shipping_full_name",
            "customer_name",
            "shipping_phone",
            "customer_phone",
            "shipping_email",
            "customer_email",
            "shipping_address_line1",
            "shipping_address_line2",
            "shipping_city",
            "shipping_state",
            "shipping_country",
            "shipping_postal_code",
            "delivery_pincode",
            "delivery_address",
            "estimated_delivery",
            "is_fast_delivery",
            "created_at",
            "updated_at",
            "items",
            "is_open",
            "can_cancel",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "is_open",
            "can_cancel",
            "delivery_address",
            "is_fast_delivery",
        ]

    def create(self, validated_data):
        items_data = self.initial_data.get("items", [])
        if "items" in validated_data:
            validated_data.pop("items")

        # Map legacy inputs from initial_data if missing in validated_data
        init_data = self.initial_data
        if not validated_data.get("shipping_full_name"):
            validated_data["shipping_full_name"] = init_data.get("customer_name") or "Guest Customer"
        if not validated_data.get("shipping_phone"):
            validated_data["shipping_phone"] = init_data.get("customer_phone") or ""
        if not validated_data.get("shipping_email"):
            validated_data["shipping_email"] = init_data.get("customer_email") or ""
        if not validated_data.get("shipping_postal_code"):
            validated_data["shipping_postal_code"] = init_data.get("delivery_pincode") or "400001"
        if not validated_data.get("shipping_address_line1"):
            validated_data["shipping_address_line1"] = init_data.get("delivery_address") or "Standard Address"
        if not validated_data.get("estimated_delivery"):
            if init_data.get("is_fast_delivery"):
                validated_data["estimated_delivery"] = "Express (60 Mins)"
            else:
                validated_data["estimated_delivery"] = "3-5 Business Days"

        # Status normalization
        st = validated_data.get("order_status") or init_data.get("status") or "Pending"
        status_map = {
            "PLACED": "Pending",
            "Placed": "Pending",
            "Pending": "Pending",
            "CONFIRMED": "Confirmed",
            "Confirmed": "Confirmed",
            "PACKED": "Processing",
            "Processing": "Processing",
            "SHIPPED": "Shipped",
            "Shipped": "Shipped",
            "OUT_FOR_DELIVERY": "Out for Delivery",
            "Out for Delivery": "Out for Delivery",
            "DELIVERED": "Delivered",
            "Delivered": "Delivered",
            "CANCELLED": "Cancelled",
            "Cancelled": "Cancelled",
            "RETURNED": "Returned",
            "Returned": "Returned",
        }
        validated_data["order_status"] = status_map.get(st, "Pending")

        order = Order.objects.create(**validated_data)
        total_order_amount = Decimal("0.00")

        for item_data in items_data:
            prod_id = str(item_data.get("product_id") or item_data.get("product") or "")
            product = None
            if prod_id and prod_id.isdigit():
                product = Product.objects.filter(pk=int(prod_id)).first()

            p_name = item_data.get("product_name") or (product.product_name if product else "Product")
            p_image = item_data.get("product_image") or (
                str(product.primary_image.url if product.primary_image else (product.image.url if product.image else ""))
                if product else ""
            )
            p_sku = item_data.get("sku") or (product.sku if product else f"SKU-{order.id}")
            brand = item_data.get("brand_name") or (getattr(product.designer, "brand_name", "") if (product and product.designer) else "")
            color = item_data.get("color") or item_data.get("colour") or (product.colour if product else "")
            size = item_data.get("size") or (product.size if product else "")
            qty = int(item_data.get("quantity") or item_data.get("qty") or 1)
            unit_price = Decimal(str(item_data.get("price") or item_data.get("unit_price") or (product.selling_price if product else "0.00")))
            item_total = unit_price * qty
            total_order_amount += item_total

            p_data = item_data.get("product_data") or {}
            if not p_data:
                p_data = {"sku": p_sku, "brand_name": brand}

            OrderItem.objects.create(
                order=order,
                product_id=prod_id,
                product_name=p_name,
                product_image=p_image,
                product_data=p_data,
                quantity=qty,
                price=unit_price,
                total=item_total,
                size=size,
                color=color,
            )

            # Atomically reserve stock in inventory
            if product:
                product.reserved_quantity += qty
                product.save()

        order.subtotal = total_order_amount
        order.total = total_order_amount + order.shipping - order.discount
        order.save()
        return order

    def update(self, instance, validated_data):
        old_status = instance.order_status
        new_status = validated_data.get("order_status") or validated_data.get("status", old_status)

        status_map = {
            "PLACED": "Pending",
            "Placed": "Pending",
            "Pending": "Pending",
            "CONFIRMED": "Confirmed",
            "Confirmed": "Confirmed",
            "PACKED": "Processing",
            "Processing": "Processing",
            "SHIPPED": "Shipped",
            "Shipped": "Shipped",
            "OUT_FOR_DELIVERY": "Out for Delivery",
            "Out for Delivery": "Out for Delivery",
            "DELIVERED": "Delivered",
            "Delivered": "Delivered",
            "CANCELLED": "Cancelled",
            "Cancelled": "Cancelled",
            "RETURNED": "Returned",
            "Returned": "Returned",
        }
        new_status = status_map.get(new_status, new_status)
        validated_data["order_status"] = new_status

        for attr, value in validated_data.items():
            if attr != "items":
                setattr(instance, attr, value)
        instance.save()

        # Handle inventory state transitions
        if old_status != new_status:
            for item in instance.items.all():
                product = item.product
                if not product:
                    continue

                qty = item.quantity

                # Shipped: transfer from reserved to in-transit
                if new_status == "Shipped" and old_status in ["Pending", "Confirmed", "Processing"]:
                    product.reserved_quantity = max(0, product.reserved_quantity - qty)
                    product.in_transit_quantity += qty
                    product.save()

                # Delivered: deduct from in-transit and physical inventory
                elif new_status == "Delivered":
                    if old_status in ["Shipped", "Out for Delivery"]:
                        product.in_transit_quantity = max(0, product.in_transit_quantity - qty)
                    else:
                        product.reserved_quantity = max(0, product.reserved_quantity - qty)
                    product.inventory_quantity = max(0, product.inventory_quantity - qty)
                    product.save()

                # Cancelled before dispatch: unreserve inventory
                elif new_status == "Cancelled" and old_status in ["Pending", "Confirmed", "Processing"]:
                    product.reserved_quantity = max(0, product.reserved_quantity - qty)
                    product.save()

            # Automatic Settlement Generation upon Delivery
            if new_status == "Delivered":
                for item in instance.items.all():
                    if not item.settlements.filter(is_reversal=False).exists():
                        designer = (item.product.designer if (item.product and item.product.designer) else None)

                        if designer:
                            take_rate = designer.take_rate
                            gmv = item.total
                            commission = (gmv * take_rate) / Decimal("100")
                            payout = gmv - commission
                            Settlement.objects.create(
                                order=instance,
                                order_item=item,
                                designer=designer,
                                gmv=gmv,
                                take_rate=take_rate,
                                commission_amount=commission,
                                payout_amount=payout,
                                status=Settlement.SettlementStatus.PENDING,
                            )

        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        steps = [
            "Pending",
            "Confirmed",
            "Processing",
            "Shipped",
            "Out for Delivery",
            "Delivered",
        ]
        timeline = []
        created_iso = instance.created_at.isoformat() if instance.created_at else ""
        updated_iso = instance.updated_at.isoformat() if instance.updated_at else created_iso

        if instance.order_status == "Cancelled":
            timeline.append({"status": "Pending", "at": created_iso})
            timeline.append({"status": "Cancelled", "at": updated_iso})
        else:
            try:
                curr_idx = steps.index(instance.order_status)
                for i in range(curr_idx + 1):
                    timeline.append({
                        "status": steps[i],
                        "at": created_iso if i == 0 else updated_iso,
                    })
            except ValueError:
                timeline.append({"status": instance.order_status, "at": updated_iso})

        data["timeline"] = timeline
        data["amount"] = float(instance.total)
        data["total"] = float(instance.total)
        data["subtotal"] = float(instance.subtotal)
        data["discount"] = float(instance.discount)
        data["shipping"] = float(instance.shipping)
        data["customer"] = instance.shipping_full_name
        data["customer_name"] = instance.shipping_full_name
        data["customer_phone"] = instance.shipping_phone
        data["customer_email"] = instance.shipping_email or ""
        data["shipping_address_line1"] = instance.shipping_address_line1
        data["shipping_address_line2"] = instance.shipping_address_line2
        data["shipping_city"] = instance.shipping_city
        data["shipping_state"] = instance.shipping_state
        data["shipping_country"] = instance.shipping_country
        data["shipping_postal_code"] = instance.shipping_postal_code
        data["pincode"] = instance.shipping_postal_code
        data["delivery_pincode"] = instance.shipping_postal_code
        data["delivery_address"] = instance.delivery_address
        data["payment_method"] = instance.payment_method
        data["payment_status"] = instance.payment_status
        data["order_status"] = instance.order_status
        data["status"] = instance.order_status
        data["placedAt"] = created_iso
        data["fast"] = instance.is_fast_delivery
        data["eta"] = instance.estimated_delivery or ("60 minutes" if instance.is_fast_delivery else "3-5 Business Days")
        data["lines"] = [
            {
                "id": item.id,
                "skuId": item.sku,
                "name": item.product_name,
                "qty": item.quantity,
                "price": float(item.price),
                "total": float(item.total),
                "image": item.product_image or "",
                "size": item.size,
                "color": item.color,
                "brand": item.brand_name,
            }
            for item in instance.items.all()
        ]
        return data



class ReturnRequestSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    customer_name = serializers.CharField(source="order.customer_name", read_only=True)
    delivery_pincode = serializers.CharField(source="order.delivery_pincode", read_only=True)
    product_name = serializers.CharField(source="order_item.product_name", read_only=True)
    sku = serializers.CharField(source="order_item.sku", read_only=True)
    colour = serializers.CharField(source="order_item.colour", read_only=True)
    size = serializers.CharField(source="order_item.size", read_only=True)
    unit_price = serializers.DecimalField(source="order_item.unit_price", max_digits=10, decimal_places=2, read_only=True)
    return_policy = serializers.SerializerMethodField()

    class Meta:
        model = ReturnRequest
        fields = [
            "id",
            "return_number",
            "order",
            "order_number",
            "order_item",
            "customer_name",
            "delivery_pincode",
            "product_name",
            "sku",
            "colour",
            "size",
            "unit_price",
            "return_policy",
            "quantity",
            "reason",
            "status",
            "refund_amount",
            "pickup_pincode",
            "pickup_address",
            "notes",
            "inspection_notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "return_number",
            "order_number",
            "customer_name",
            "delivery_pincode",
            "product_name",
            "sku",
            "colour",
            "size",
            "unit_price",
            "return_policy",
            "created_at",
            "updated_at",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["orderId"] = instance.order.order_number if instance.order else ""
        data["skuId"] = instance.order_item.sku if instance.order_item else ""
        data["skuName"] = instance.order_item.product_name if instance.order_item else ""
        data["refund"] = float(instance.refund_amount) if instance.refund_amount else 0.0

        st = instance.status
        if st == "INSPECTED_PASSED":
            data["normalized_status"] = "PASSED"
        elif st == "INSPECTED_FAILED":
            data["normalized_status"] = "FAILED"
        else:
            data["normalized_status"] = st

        data["formatted_refund"] = f"₹{int(instance.refund_amount):,}" if instance.refund_amount else "₹0"
        return data

    def to_internal_value(self, data):
        data_copy = data.copy() if hasattr(data, "copy") else dict(data)
        if "orderId" in data_copy and "order" not in data_copy:
            data_copy["order"] = data_copy["orderId"]
        if "skuId" in data_copy and "sku" not in data_copy:
            data_copy["sku"] = data_copy["skuId"]

        # Resolve order if it's an order_number string
        order_val = data_copy.get("order")
        if isinstance(order_val, str) and not order_val.isdigit():
            ord_obj = Order.objects.filter(order_number=order_val).first()
            if ord_obj:
                data_copy["order"] = ord_obj.id

        # Resolve order_item if provided as sku or skuId
        if "order" in data_copy and data_copy.get("order"):
            ord_id = data_copy["order"]
            if "order_item" not in data_copy or not data_copy["order_item"]:
                sku_val = data_copy.get("sku") or data_copy.get("skuId")
                if sku_val:
                    item_obj = OrderItem.objects.filter(order_id=ord_id, sku=sku_val).first()
                    if item_obj:
                        data_copy["order_item"] = item_obj.id

        # Map reason text
        if "reason" in data_copy:
            r = str(data_copy["reason"]).strip()
            choice_keys = [c[0] for c in ReturnRequest.ReturnReason.choices]
            if r.upper() in choice_keys:
                data_copy["reason"] = r.upper()
            else:
                data_copy["notes"] = r
                data_copy["reason"] = ReturnRequest.ReturnReason.OTHER

        return super().to_internal_value(data_copy)

    def get_return_policy(self, obj):
        if obj.order_item and obj.order_item.product:
            return getattr(obj.order_item.product, "return_policy", "RETURNABLE")
        return "RETURNABLE"

    def validate(self, data):
        # On creation, validate order status & returnable constraints
        if self.instance is None:
            order = data.get("order")
            order_item = data.get("order_item")
            qty = data.get("quantity", 1)

            if not order and order_item:
                order = order_item.order
                data["order"] = order

            if not order or not order_item:
                raise serializers.ValidationError("Both order and order_item are required.")

            if order_item.order_id != order.id:
                raise serializers.ValidationError("The selected item does not belong to the specified order.")

            if order.order_status not in [Order.OrderStatus.DELIVERED, "DELIVERED", "Delivered"]:
                raise serializers.ValidationError(
                    f"Only delivered orders can be returned. Current order status: {order.order_status}"
                )

            product = order_item.product
            if product and getattr(product, "return_policy", "RETURNABLE") != "RETURNABLE":
                raise serializers.ValidationError(
                    "This product has a NON_RETURNABLE policy."
                )

            # Check quantity limits
            active_returns = order_item.returns.exclude(status=ReturnRequest.ReturnStatus.REJECTED)
            already_returned = sum(r.quantity for r in active_returns)
            remaining = order_item.quantity - already_returned
            if qty > remaining:
                raise serializers.ValidationError(
                    f"Requested return quantity ({qty}) exceeds available returnable quantity ({remaining})."
                )

        return data

    def create(self, validated_data):
        order_item = validated_data.get("order_item")
        qty = validated_data.get("quantity", 1)
        if not validated_data.get("refund_amount") and order_item:
            validated_data["refund_amount"] = order_item.unit_price * qty

        order = validated_data.get("order")
        if order and not validated_data.get("pickup_pincode"):
            validated_data["pickup_pincode"] = order.delivery_pincode
        if order and not validated_data.get("pickup_address"):
            validated_data["pickup_address"] = order.delivery_address

        return super().create(validated_data)

    def update(self, instance, validated_data):
        old_status = instance.status
        new_status = validated_data.get("status", old_status)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Stock ledger synchronization
        if old_status != new_status and instance.order_item:
            product = instance.order_item.product
            qty = instance.quantity

            if product:
                # 1. Physical receipt at warehouse
                if new_status == ReturnRequest.ReturnStatus.RECEIVED and old_status in [
                    ReturnRequest.ReturnStatus.REQUESTED,
                    ReturnRequest.ReturnStatus.PICKUP_SCHEDULED,
                ]:
                    product.returned_quantity += qty
                    product.save()

                # 2. Passed QC -> back to available inventory
                elif new_status == ReturnRequest.ReturnStatus.INSPECTED_PASSED and old_status == ReturnRequest.ReturnStatus.RECEIVED:
                    product.returned_quantity = max(0, product.returned_quantity - qty)
                    product.inventory_quantity += qty
                    product.save()

                # 3. Failed QC -> marked damaged
                elif new_status == ReturnRequest.ReturnStatus.INSPECTED_FAILED and old_status == ReturnRequest.ReturnStatus.RECEIVED:
                    product.returned_quantity = max(0, product.returned_quantity - qty)
                    product.damaged_quantity += qty
                    product.save()

        # Reversal settlement generation on refund
        if new_status == ReturnRequest.ReturnStatus.REFUNDED and old_status != ReturnRequest.ReturnStatus.REFUNDED:
            if not instance.reversal_settlements.exists():
                product = instance.order_item.product if instance.order_item else None
                designer = (product.designer if (product and product.designer) else None)

                if designer:
                    take_rate = designer.take_rate
                    refund_gmv = instance.refund_amount
                    commission_rev = (refund_gmv * take_rate) / Decimal("100")
                    payout_deduction = refund_gmv - commission_rev
                    reason_text = instance.get_reason_display() if hasattr(instance, 'get_reason_display') else instance.reason
                    Settlement.objects.create(
                        order=instance.order,
                        order_item=instance.order_item,
                        designer=designer,
                        return_request=instance,
                        is_reversal=True,
                        gmv=-refund_gmv,
                        take_rate=take_rate,
                        commission_amount=-commission_rev,
                        payout_amount=-payout_deduction,
                        status=Settlement.SettlementStatus.REVERSED,
                        notes=f"Reversal for Return #{instance.return_number} ({reason_text})"
                    )

        return instance


class SettlementSerializer(serializers.ModelSerializer):
    mrp = serializers.SerializerMethodField()
    unit_price = serializers.DecimalField(source="order_item.price", max_digits=12, decimal_places=2, read_only=True, default=None)

    def get_mrp(self, instance):
        item = instance.order_item
        if not item:
            return None
        snapshot = item.product_data if isinstance(item.product_data, dict) else {}
        if snapshot.get("mrp") is not None:
            return str(snapshot["mrp"])
        product = item.product
        return str(product.mrp) if product else None

    order_number = serializers.CharField(source="order.order_number", read_only=True)
    brand_name = serializers.CharField(source="designer.brand_name", read_only=True)
    designer_code = serializers.CharField(source="designer.designer_code", read_only=True)
    product_name = serializers.CharField(source="order_item.product_name", read_only=True)
    sku = serializers.CharField(source="order_item.sku", read_only=True)
    quantity = serializers.IntegerField(source="order_item.quantity", read_only=True)
    return_number = serializers.CharField(source="return_request.return_number", read_only=True, default=None)

    class Meta:
        model = Settlement
        fields = [
            "id",
            "settlement_number",
            "order",
            "order_number",
            "order_item",
            "designer",
            "designer_code",
            "brand_name",
            "product_name",
            "sku",
            "quantity",
            "mrp",
            "unit_price",
            "return_request",
            "return_number",
            "is_reversal",
            "gmv",
            "take_rate",
            "commission_amount",
            "tax_amount",
            "payout_amount",
            "status",
            "payout_reference",
            "paid_at",
            "reconciled_at",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "settlement_number",
            "order_number",
            "designer_code",
            "brand_name",
            "product_name",
            "sku",
            "quantity",
            "return_number",
            "created_at",
            "updated_at",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["orderId"] = instance.order.order_number if instance.order else ""
        data["designerId"] = instance.designer_id
        data["designer"] = (
            instance.designer.brand_name
            if (instance.designer and instance.designer.brand_name)
            else (instance.designer.designer_name if instance.designer else "Independent Studio")
        )
        data["takeRate"] = float(instance.take_rate)
        data["commission"] = float(instance.commission_amount) if instance.commission_amount else 0.0
        data["net"] = float(instance.payout_amount) if instance.payout_amount else 0.0
        data["gmv"] = float(instance.gmv) if instance.gmv else 0.0
        data["formatted_gmv"] = f"₹{int(instance.gmv):,}" if instance.gmv else "₹0"
        data["formatted_net"] = f"₹{int(instance.payout_amount):,}" if instance.payout_amount else "₹0"
        data["formatted_commission"] = f"₹{int(instance.commission_amount):,}" if instance.commission_amount else "₹0"
        return data


