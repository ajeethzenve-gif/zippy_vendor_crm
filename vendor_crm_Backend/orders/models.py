import uuid
from decimal import Decimal
from django.utils import timezone
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator


# ============================================================
# ORDER
# ============================================================

class Order(models.Model):

    PAYMENT_STATUS_CHOICES = (
        ("Pending", "Pending"),
        ("Paid", "Paid"),
        ("Failed", "Failed"),
        ("Refunded", "Refunded"),
        ("Partially Refunded", "Partially Refunded"),
    )

    ORDER_STATUS_CHOICES = (
        ("Pending", "Pending"),
        ("Confirmed", "Confirmed"),
        ("Processing", "Processing"),
        ("Shipped", "Shipped"),
        ("Out for Delivery", "Out for Delivery"),
        ("Delivered", "Delivered"),
        ("Cancelled", "Cancelled"),
        ("Returned", "Returned"),
    )

    PAYMENT_METHOD_CHOICES = (
        ("COD", "Cash on Delivery"),
        ("Cash on Delivery", "Cash on Delivery"),
        ("Razorpay", "Razorpay"),
        ("Wallet", "Wallet"),
        ("UPI", "UPI"),
        ("Card", "Card"),
        ("Net Banking", "Net Banking"),
    )

    # --------------------------------------------------------
    # User
    # --------------------------------------------------------

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )

    user_id_string = models.CharField(
        max_length=100,
        default="guest",
        blank=True,
    )

    # --------------------------------------------------------
    # Order identification
    # --------------------------------------------------------

    order_number = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
    )

    # --------------------------------------------------------
    # Amounts
    # --------------------------------------------------------

    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    discount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    shipping = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    # --------------------------------------------------------
    # Payment
    # --------------------------------------------------------

    payment_status = models.CharField(
        max_length=30,
        choices=PAYMENT_STATUS_CHOICES,
        default="Pending",
    )

    payment_method = models.CharField(
        max_length=50,
        choices=PAYMENT_METHOD_CHOICES,
        default="COD",
    )

    # --------------------------------------------------------
    # Order status
    # --------------------------------------------------------

    order_status = models.CharField(
        max_length=50,
        choices=ORDER_STATUS_CHOICES,
        default="Pending",
    )

    # --------------------------------------------------------
    # Shipping address
    # --------------------------------------------------------

    shipping_full_name = models.CharField(
        max_length=100,
        default="",
    )

    shipping_phone = models.CharField(
        max_length=15,
        default="",
    )

    shipping_email = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    shipping_address_line1 = models.CharField(
        max_length=255,
        default="",
    )

    shipping_address_line2 = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    shipping_city = models.CharField(
        max_length=100,
        default="",
    )

    shipping_state = models.CharField(
        max_length=100,
        default="",
    )

    shipping_country = models.CharField(
        max_length=100,
        default="India",
    )

    shipping_postal_code = models.CharField(
        max_length=10,
        default="",
    )

    # --------------------------------------------------------
    # Delivery
    # --------------------------------------------------------

    estimated_delivery = models.CharField(
        max_length=100,
        default="3-5 Business Days",
        blank=True,
        null=True,
    )

    # --------------------------------------------------------
    # Timestamps
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "orders_order"
        ordering = ["-created_at"]
        verbose_name = "Order"
        verbose_name_plural = "Orders"

    def __str__(self):
        return self.order_number or f"Order {self.id}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)

        if is_new and not self.order_number:
            import random
            self.order_number = f"ZNV-{self.created_at.year}-{1000 + self.id}"
            super().save(update_fields=["order_number"])

    # --------------------------------------------------------
    # Backwards-compatibility & CRM Helpers
    # --------------------------------------------------------
    class OrderStatus:
        PENDING = "Pending"
        CONFIRMED = "Confirmed"
        PROCESSING = "Processing"
        SHIPPED = "Shipped"
        OUT_FOR_DELIVERY = "Out for Delivery"
        DELIVERED = "Delivered"
        CANCELLED = "Cancelled"
        RETURNED = "Returned"

        # Legacy uppercase aliases
        PLACED = "Pending"
        PACKED = "Processing"

    @property
    def status(self):
        return self.order_status

    @status.setter
    def status(self, val):
        self.order_status = val

    @property
    def total_amount(self):
        return self.total

    @total_amount.setter
    def total_amount(self, val):
        self.total = val

    @property
    def customer_name(self):
        return self.shipping_full_name

    @customer_name.setter
    def customer_name(self, val):
        self.shipping_full_name = val

    @property
    def customer_phone(self):
        return self.shipping_phone

    @customer_phone.setter
    def customer_phone(self, val):
        self.shipping_phone = val

    @property
    def customer_email(self):
        return self.shipping_email

    @customer_email.setter
    def customer_email(self, val):
        self.shipping_email = val

    @property
    def delivery_pincode(self):
        return self.shipping_postal_code

    @delivery_pincode.setter
    def delivery_pincode(self, val):
        self.shipping_postal_code = val

    @property
    def delivery_address(self):
        parts = [p for p in [
            self.shipping_address_line1,
            self.shipping_address_line2,
            self.shipping_city,
            self.shipping_state,
            self.shipping_postal_code,
            self.shipping_country if self.shipping_country != "India" else None
        ] if p]
        return ", ".join(parts)

    @property
    def is_fast_delivery(self):
        return "60" in (self.estimated_delivery or "") or "Express" in (self.estimated_delivery or "")

    @property
    def is_open(self):
        return self.order_status not in [
            self.OrderStatus.DELIVERED,
            self.OrderStatus.CANCELLED,
            self.OrderStatus.RETURNED,
        ]

    @property
    def can_cancel(self):
        return self.order_status in [
            self.OrderStatus.PENDING,
            self.OrderStatus.CONFIRMED,
            self.OrderStatus.PROCESSING,
        ]


# ============================================================
# ORDER ITEM
# ============================================================

class OrderItem(models.Model):

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )

    product_id = models.CharField(
        max_length=100,
        default="",
    )

    product_name = models.CharField(
        max_length=255,
    )

    product_image = models.TextField(
        blank=True,
        null=True,
    )

    product_data = models.JSONField(
        default=dict,
        blank=True,
    )

    quantity = models.PositiveIntegerField(
        default=1,
    )

    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    # Optional variant information
    size = models.CharField(
        max_length=50,
        blank=True,
        default="",
    )

    color = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(
        default=timezone.now,
    )

    class Meta:
        db_table = "orders_orderitem"
        verbose_name = "Order Item"
        verbose_name_plural = "Order Items"

    def save(self, *args, **kwargs):
        self.total = self.price * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"

    # --------------------------------------------------------
    # Backwards-compatibility & CRM Helpers
    # --------------------------------------------------------
    @property
    def product(self):
        if not hasattr(self, "_cached_product"):
            from products.models import Product
            if self.product_id and str(self.product_id).isdigit():
                self._cached_product = Product.objects.filter(pk=int(self.product_id)).first()
            else:
                self._cached_product = None
        return self._cached_product

    @property
    def unit_price(self):
        return self.price

    @unit_price.setter
    def unit_price(self, val):
        self.price = val

    @property
    def total_price(self):
        return self.total

    @total_price.setter
    def total_price(self, val):
        self.total = val

    @property
    def colour(self):
        return self.color

    @colour.setter
    def colour(self, val):
        self.color = val

    @property
    def sku(self):
        if self.product_data and isinstance(self.product_data, dict) and self.product_data.get("sku"):
            return self.product_data["sku"]
        if self.product:
            return self.product.sku
        return f"SKU-{self.product_id or self.id}"

    @property
    def brand_name(self):
        if self.product_data and isinstance(self.product_data, dict) and self.product_data.get("brand_name"):
            return self.product_data["brand_name"]
        if self.product and self.product.designer:
            return self.product.designer.brand_name
        return ""


# ============================================================
# RETURN REQUEST
# ============================================================

class ReturnRequest(models.Model):
    class ReturnStatus(models.TextChoices):
        REQUESTED = "REQUESTED", "Requested"
        PICKUP_SCHEDULED = "PICKUP_SCHEDULED", "Pickup Scheduled"
        RECEIVED = "RECEIVED", "Received at Warehouse"
        INSPECTED_PASSED = "INSPECTED_PASSED", "Inspected - Passed"
        INSPECTED_FAILED = "INSPECTED_FAILED", "Inspected - Failed QC"
        REFUNDED = "REFUNDED", "Refunded"
        REJECTED = "REJECTED", "Rejected"

    class ReturnReason(models.TextChoices):
        SIZE_FIT = "SIZE_FIT", "Size / Fit Issue"
        DEFECTIVE = "DEFECTIVE", "Defective / Damaged Item"
        WRONG_ITEM = "WRONG_ITEM", "Wrong Item Delivered"
        QUALITY_ISSUE = "QUALITY_ISSUE", "Quality Not as Expected"
        NOT_NEEDED = "NOT_NEEDED", "No Longer Needed"
        OTHER = "OTHER", "Other"

    return_number = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        blank=True,
        verbose_name="Return Number"
    )

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="returns",
        verbose_name="Order"
    )

    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.CASCADE,
        related_name="returns",
        verbose_name="Order Item"
    )

    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name="Returned Quantity"
    )

    reason = models.CharField(
        max_length=50,
        choices=ReturnReason.choices,
        default=ReturnReason.SIZE_FIT,
        verbose_name="Reason for Return"
    )

    status = models.CharField(
        max_length=30,
        choices=ReturnStatus.choices,
        default=ReturnStatus.REQUESTED,
        db_index=True,
        verbose_name="Return Status"
    )

    refund_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Refund Amount"
    )

    pickup_pincode = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        verbose_name="Pickup Pincode"
    )

    pickup_address = models.TextField(
        blank=True,
        null=True,
        verbose_name="Pickup Address"
    )

    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Customer / Return Notes"
    )

    inspection_notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Inspection / QC Notes"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Created At"
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated At"
    )

    class Meta:
        db_table = "orders_return_request"
        ordering = ["-created_at"]
        verbose_name = "Return Request"
        verbose_name_plural = "Return Requests"

    def __str__(self):
        return f"{self.return_number} - {self.status}"

    def save(self, *args, **kwargs):
        if not self.return_number:
            self.return_number = f"ZNV-RTN-{uuid.uuid4().hex[:8].upper()}"
        if not self.refund_amount and self.order_item:
            self.refund_amount = self.order_item.price * self.quantity
        if not self.pickup_pincode and self.order:
            self.pickup_pincode = self.order.shipping_postal_code
        if not self.pickup_address and self.order:
            self.pickup_address = self.order.delivery_address
        super().save(*args, **kwargs)


# ============================================================
# SETTLEMENT
# ============================================================

class Settlement(models.Model):
    class SettlementStatus(models.TextChoices):
        PENDING = "PENDING", "Pending Approval"
        APPROVED = "APPROVED", "Approved"
        PAID = "PAID", "Paid"
        RECONCILED = "RECONCILED", "Reconciled"
        REVERSED = "REVERSED", "Reversed by Return"

    settlement_number = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        blank=True,
        verbose_name="Settlement Number"
    )

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="settlements",
        verbose_name="Order"
    )

    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.CASCADE,
        related_name="settlements",
        verbose_name="Order Item"
    )

    designer = models.ForeignKey(
        "vendors.Vendor",
        on_delete=models.CASCADE,
        related_name="settlements",
        verbose_name="Designer"
    )

    return_request = models.ForeignKey(
        "orders.ReturnRequest",
        on_delete=models.SET_NULL,
        related_name="reversal_settlements",
        null=True,
        blank=True,
        verbose_name="Associated Return"
    )

    is_reversal = models.BooleanField(
        default=False,
        verbose_name="Is Reversal"
    )

    gmv = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Gross Merchandise Value (GMV)"
    )

    take_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("15.00"),
        verbose_name="Take Rate (%)"
    )

    commission_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Zenve Commission"
    )

    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Tax (GST)"
    )

    payout_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Payable to Designer"
    )

    status = models.CharField(
        max_length=30,
        choices=SettlementStatus.choices,
        default=SettlementStatus.PENDING,
        db_index=True,
        verbose_name="Settlement Status"
    )

    payout_reference = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Payout Reference / UTR"
    )

    paid_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Paid At"
    )

    reconciled_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Reconciled At"
    )

    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Settlement Notes"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Created At"
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated At"
    )

    class Meta:
        db_table = "orders_settlement"
        ordering = ["-created_at"]
        verbose_name = "Settlement"
        verbose_name_plural = "Settlements"

    def __str__(self):
        return f"{self.settlement_number} - {self.designer.brand_name} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.settlement_number:
            prefix = "ZNV-REV" if self.is_reversal else "ZNV-STL"
            self.settlement_number = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"

        if not self.commission_amount:
            self.commission_amount = (self.gmv * self.take_rate) / Decimal("100")

        if not self.payout_amount:
            self.payout_amount = self.gmv - self.commission_amount - self.tax_amount

        super().save(*args, **kwargs)
