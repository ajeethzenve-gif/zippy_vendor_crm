from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError


class Product(models.Model):
    # =========================================================
    # STATUS CHOICES
    # =========================================================

    class ProductStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING_QA = "PENDING_QA", "Pending QA"
        CORRECTION = "CORRECTION", "Needs Correction"
        APPROVED = "APPROVED", "Approved"
        LIVE = "LIVE", "Live"
        REJECTED = "REJECTED", "Rejected"
        INACTIVE = "INACTIVE", "Inactive"

    class ReturnPolicy(models.TextChoices):
        RETURNABLE = "RETURNABLE", "Returnable"
        FINAL_SALE = "FINAL_SALE", "Final Sale"

    class FulfilmentLocation(models.TextChoices):
        MUMBAI_FC = "MUMBAI_FC", "Mumbai FC"
        BENGALURU_FC = "BENGALURU_FC", "Bengaluru FC"
        BANGALORE_FC = "BANGALORE_FC", "Bangalore FC"
        KOCHI_FC = "KOCHI_FC", "Kochi FC"
        CHENNAI_FC = "CHENNAI_FC", "Chennai FC"
        DELHI_FC = "DELHI_FC", "Delhi FC"
        DESIGNER_STUDIO = "DESIGNER_STUDIO", "Designer Studio"

    class Size(models.TextChoices):
        XS = "XS", "XS"
        S = "S", "S"
        M = "M", "M"
        L = "L", "L"
        XL = "XL", "XL"
        XXL = "XXL", "XXL"
        FREE = "FREE", "Free Size"

    class SalesChannel(models.TextChoices):
        ONLINE = "ONLINE", "Online"
        OFFLINE = "OFFLINE", "Offline"
        BOTH = "BOTH", "Online & Offline"

    # =========================================================
    # BASIC PRODUCT INFORMATION
    # =========================================================

    product_name = models.CharField(
        max_length=255,
        verbose_name="Product Name"
    )

    sku = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        verbose_name="SKU"
    )

    description = models.TextField(
        blank=True,
        null=True,
        verbose_name="Product Description"
    )

    # =========================================================
    # PRODUCT CLASSIFICATION
    # =========================================================

    designer = models.ForeignKey(
        "vendors.Vendor",
        on_delete=models.CASCADE,
        related_name="products",
        verbose_name="Designer",
    )

    category = models.CharField(
        max_length=150,
        verbose_name="Category"
    )

    subcategory = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        verbose_name="Subcategory"
    )

    # =========================================================
    # PRODUCT ATTRIBUTES
    # =========================================================

    colour = models.CharField(
        max_length=100,
        verbose_name="Colour"
    )

    # Legacy single-size field. New products should use ProductSizeStock.
    size = models.CharField(
        max_length=20,
        choices=Size.choices,
        blank=True,
        null=True,
        verbose_name="Legacy Single Size"
    )

    material = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        verbose_name="Material"
    )

    pet_safety = models.TextField(
        default="No loose beads. Breathable fabric. Supervised wear recommended.",
        blank=True,
        verbose_name="Pet Safety Information",
    )

    # =========================================================
    # COMPLIANCE & LOGISTICS
    # =========================================================

    barcode = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Barcode / EAN"
    )

    hsn = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="HSN Code"
    )

    gst_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("12.00"),
        verbose_name="GST Rate (%)"
    )

    weight_g = models.PositiveIntegerField(
        default=250,
        blank=True,
        verbose_name="Weight (g)"
    )

    dimensions = models.CharField(
        max_length=100,
        blank=True,
        default="25x20x3 cm",
        verbose_name="Dimensions"
    )

    origin = models.CharField(
        max_length=100,
        default="India",
        blank=True,
        verbose_name="Country of Origin"
    )

    manufacturer = models.TextField(
        blank=True,
        default="Crafted in India",
        verbose_name="Manufacturing Information"
    )

    # =========================================================
    # PRODUCT DETAIL & CARE
    # =========================================================

    care = models.TextField(
        blank=True,
        default="Dry clean only or gentle hand wash.",
        verbose_name="Care Instructions"
    )

    # =========================================================
    # MEDIA
    # =========================================================

    image = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name="Image URL"
    )

    video = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name="Video URL"
    )

    alt_text = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Image Alt Text"
    )

    # =========================================================
    # DISCOVERY & SEO
    # =========================================================

    seo_title = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="SEO Title"
    )

    seo_description = models.TextField(
        blank=True,
        default="",
        verbose_name="Meta Description"
    )

    keywords = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Search Keywords"
    )

    collection = models.CharField(
        max_length=100,
        blank=True,
        default="Diwali Luxe",
        verbose_name="Collection"
    )

    occasion = models.CharField(
        max_length=100,
        blank=True,
        default="Festive",
        verbose_name="Occasion"
    )

    season = models.CharField(
        max_length=100,
        blank=True,
        default="AW 2026",
        verbose_name="Season"
    )

    # =========================================================
    # MERCHANDISING FLAGS
    # =========================================================

    bestseller = models.BooleanField(
        default=False,
        verbose_name="Bestseller"
    )

    new_arrival = models.BooleanField(
        default=True,
        verbose_name="New Arrival"
    )

    featured = models.BooleanField(
        default=False,
        verbose_name="Featured"
    )

    limited_edition = models.BooleanField(
        default=False,
        verbose_name="Limited Edition"
    )

    # =========================================================
    # PRICING
    # =========================================================

    mrp = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[
            MinValueValidator(0)
        ],
        verbose_name="MRP"
    )

    selling_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[
            MinValueValidator(0)
        ],
        verbose_name="Selling Price"
    )

    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100)
        ],
        verbose_name="Discount Percentage"
    )

    # =========================================================
    # SALES CHANNEL
    # =========================================================

    sales_channel = models.CharField(
        max_length=20,
        choices=SalesChannel.choices,
        default=SalesChannel.ONLINE,
        db_index=True,
        verbose_name="Sales Channel",
        help_text="Choose Online, Offline, or both.",
    )

    # =========================================================
    # INVENTORY & STOCK LEDGER
    # =========================================================

    inventory_quantity = models.PositiveIntegerField(
        default=0,
        verbose_name="Physical Inventory Quantity"
    )

    reserved_quantity = models.PositiveIntegerField(
        default=0,
        verbose_name="Reserved Quantity"
    )

    damaged_quantity = models.PositiveIntegerField(
        default=0,
        verbose_name="Damaged Quantity"
    )

    quarantined_quantity = models.PositiveIntegerField(
        default=0,
        verbose_name="Quarantined Quantity"
    )

    in_transit_quantity = models.PositiveIntegerField(
        default=0,
        verbose_name="In-Transit Quantity"
    )

    returned_quantity = models.PositiveIntegerField(
        default=0,
        verbose_name="Returned Quantity"
    )

    low_stock_threshold = models.PositiveIntegerField(
        default=5,
        verbose_name="Low Stock Threshold"
    )

    # =========================================================
    # FULFILMENT
    # =========================================================

    fulfilment_location = models.CharField(
        max_length=100,
        choices=FulfilmentLocation.choices,
        verbose_name="Fulfilment Location"
    )

    fast_delivery = models.BooleanField(
        default=False,
        verbose_name="Fast Delivery"
    )

    # =========================================================
    # RETURN POLICY
    # =========================================================

    return_policy = models.CharField(
        max_length=30,
        choices=ReturnPolicy.choices,
        default=ReturnPolicy.RETURNABLE,
        verbose_name="Return Policy"
    )

    # =========================================================
    # PRODUCT STATUS
    # =========================================================

    status = models.CharField(
        max_length=30,
        choices=ProductStatus.choices,
        default=ProductStatus.DRAFT,
        db_index=True,
        verbose_name="Product Status"
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name="Active"
    )

    is_live = models.BooleanField(
        default=False,
        verbose_name="Live on Storefront"
    )

    # =========================================================
    # QA REVIEW
    # =========================================================

    qa_score = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100)
        ],
        verbose_name="QA Score"
    )

    qa_scores = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="QA Dimension Scores"
    )

    qa_note = models.TextField(
        blank=True,
        default="",
        verbose_name="QA Reviewer Note"
    )

    # =========================================================
    # PRODUCT IMAGE
    # =========================================================

    primary_image = models.ImageField(
        upload_to="products/",
        blank=True,
        null=True,
        verbose_name="Primary Product Image"
    )

    # =========================================================
    # AUDIT FIELDS
    # =========================================================

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    # =========================================================
    # META
    # =========================================================

    class Meta:
        db_table = "product"

        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["sku"]),
            models.Index(fields=["status"]),
            models.Index(fields=["category"]),
            models.Index(fields=["designer"]),
            models.Index(fields=["is_live"]),
            models.Index(fields=["is_active"]),
        ]

        verbose_name = "Product"
        verbose_name_plural = "Products"

    # =========================================================
    # VALIDATION
    # =========================================================

    def clean(self):
        """
        Validate product pricing.
        """

        if self.selling_price > self.mrp:
            raise ValidationError({
                "selling_price": "Selling price cannot be greater than MRP."
            })

        if self.mrp > 0:
            calculated_discount = (
                (self.mrp - self.selling_price) / self.mrp
            ) * 100

            # Allow a very small decimal difference
            if abs(
                float(self.discount_percentage) -
                float(calculated_discount)
            ) > 0.01:
                raise ValidationError({
                    "discount_percentage": (
                        "Discount percentage does not match "
                        "MRP and selling price."
                    )
                })

    # =========================================================
    # METHODS
    # =========================================================

    def __str__(self):
        return f"{self.product_name} ({self.sku})"

    # =========================================================
    # DISCOUNT AMOUNT
    # =========================================================

    @property
    def discount_amount(self):
        """
        Returns the actual discount amount.
        """

        return self.mrp - self.selling_price

    # =========================================================
    # STOCK STATUS & LEDGER PROPERTIES
    # =========================================================

    @property
    def physical_quantity(self):
        return self.inventory_quantity

    @property
    def online_quantity(self):
        return sum(item.online_quantity for item in self.size_stocks.all())

    @property
    def offline_quantity(self):
        return sum(item.offline_quantity for item in self.size_stocks.all())

    @property
    def total_size_quantity(self):
        return sum(item.total_quantity for item in self.size_stocks.all())

    @property
    def selected_sizes(self):
        return list(self.size_stocks.order_by("id").values_list("size", flat=True))

    @property
    def size_stock_summary(self):
        return [
            {
                "size": item.size,
                "online_quantity": item.online_quantity,
                "offline_quantity": item.offline_quantity,
                "total_quantity": item.total_quantity,
            }
            for item in self.size_stocks.order_by("id")
        ]

    @property
    def available_quantity(self):
        blocked = self.reserved_quantity + self.damaged_quantity + self.quarantined_quantity
        return max(0, self.inventory_quantity - blocked)

    @property
    def stock_status(self):
        """
        Returns the current inventory status based on available units.
        """
        if self.available_quantity == 0:
            return "OUT_OF_STOCK"

        if self.available_quantity <= self.low_stock_threshold:
            return "LOW_STOCK"

        return "IN_STOCK"

    # =========================================================
    # FAST DELIVERY
    # =========================================================

    @property
    def is_fast_delivery(self):
        """
        Returns True only when fast delivery is enabled
        and the product has available stock.
        """
        return (
            self.fast_delivery
            and self.available_quantity > 0
        )

    # =========================================================
    # DESIGNER INTEGRATION PROPERTIES
    # =========================================================

    @property
    def designer_name(self):
        return self.designer.designer_name if self.designer else ""

    @property
    def designer_brand(self):
        return self.designer.brand_name if self.designer else ""

    @property
    def designer_code(self):
        return self.designer.designer_code if self.designer else ""

    @property
    def designer_take_rate(self):
        return self.designer.take_rate if self.designer else 0

    @property
    def units_sold(self):
        from django.db.models import Sum
        try:
            from orders.models import OrderItem
            res = OrderItem.objects.filter(product_id=str(self.pk)).exclude(order__order_status__in=["Cancelled", "Returned"]).aggregate(total=Sum("quantity"))["total"]
            return res or 0
        except Exception:
            return 0

    @property
    def days_of_stock(self):
        sold = self.units_sold
        if sold > 0 and self.available_quantity > 0:
            daily_velocity = max(0.1, sold / 30.0)
            return int(self.available_quantity / daily_velocity)
        elif self.available_quantity > 0:
            return 45
        return 0

    @property
    def qa_status(self):
        return self.status

# =========================================================
# PRODUCT SIZE / CHANNEL STOCK
# =========================================================

class ProductSizeStock(models.Model):
    product = models.ForeignKey(
        Product,
        related_name="size_stocks",
        on_delete=models.CASCADE,
        verbose_name="Product",
    )

    size = models.CharField(
        max_length=20,
        choices=Product.Size.choices,
        verbose_name="Size",
    )

    online_quantity = models.PositiveIntegerField(
        default=0,
        verbose_name="Online Quantity",
    )

    offline_quantity = models.PositiveIntegerField(
        default=0,
        verbose_name="Offline Store Quantity",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "product_size_stock"
        ordering = ["product_id", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "size"],
                name="unique_product_size_stock",
            )
        ]
        indexes = [
            models.Index(fields=["product", "size"]),
        ]
        verbose_name = "Product Size Stock"
        verbose_name_plural = "Product Size Stocks"

    def clean(self):
        super().clean()

        if self.product_id:
            if (
                self.product.sales_channel == Product.SalesChannel.ONLINE
                and self.offline_quantity > 0
            ):
                raise ValidationError({
                    "offline_quantity": "Offline quantity must be 0 for Online-only products."
                })

            if (
                self.product.sales_channel == Product.SalesChannel.OFFLINE
                and self.online_quantity > 0
            ):
                raise ValidationError({
                    "online_quantity": "Online quantity must be 0 for Offline-only products."
                })

    @property
    def total_quantity(self):
        return self.online_quantity + self.offline_quantity

    def __str__(self):
        return (
            f"{self.product.product_name} - {self.size} "
            f"(Online: {self.online_quantity}, Offline: {self.offline_quantity})"
        )


import os
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.core.validators import FileExtensionValidator
from django.db import models

private_storage = FileSystemStorage(location=settings.PRIVATE_MEDIA_ROOT)

def product_image_path(instance, filename):
    extension = os.path.splitext(filename)[1].lower()
    return f"products/{instance.product_id}/{instance.position}{extension}"


class MediaJob(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="media_job")
    status = models.CharField(max_length=24, default="IN_PROGRESS", choices=[
        ("IN_PROGRESS", "In progress"), ("IN_REVIEW", "Designer review"),
        ("CHANGES_REQUESTED", "Changes requested"), ("APPROVED", "Approved")])
    figma_url = models.URLField(max_length=1000, blank=True)
    notes = models.TextField(blank=True)
    feedback = models.TextField(blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


class MediaAsset(models.Model):
    job = models.ForeignKey(MediaJob, on_delete=models.CASCADE, related_name="assets")
    image = models.ImageField(storage=private_storage, upload_to="media_outputs/%Y/%m/")
    created_at = models.DateTimeField(auto_now_add=True)


class ProductImage(models.Model):
    class Position(models.IntegerChoices):
        ONE = 1, "Image 1"
        TWO = 2, "Image 2"
        THREE = 3, "Image 3"
        FOUR = 4, "Image 4"

    product = models.ForeignKey(
        Product,
        related_name="product_images",
        on_delete=models.CASCADE,
    )
    position = models.PositiveSmallIntegerField(choices=Position.choices)

    image = models.ImageField(
        storage=private_storage,
        upload_to=product_image_path,
        validators=[FileExtensionValidator(["jpg", "jpeg", "png", "webp"])],
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["product", "position"],
                name="unique_product_image_position",
            )
        ]
        ordering = ["position"]
