import json
from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from .models import (
    Product,
    ProductImage,
    ProductSizeStock,
)
from vendors.models import Vendor


# =========================================================
# DESIGNER FIELD
# =========================================================

class FlexibleDesignerField(serializers.PrimaryKeyRelatedField):
    """
    Accepts:
    - Designer ID
    - Designer ID as string
    - brand_name
    - designer_name
    - designer_code
    """

    def to_internal_value(self, data):

        if isinstance(data, int):
            return super().to_internal_value(data)

        if isinstance(data, str):

            value = data.strip()

            if value.isdigit():
                return super().to_internal_value(
                    int(value)
                )

            if value:
                designer = (
                    Vendor.objects.filter(
                        brand_name__iexact=value
                    ).first()
                    or
                    Vendor.objects.filter(
                        vendor_name__iexact=value
                    ).first()
                    or
                    Vendor.objects.filter(
                        vendor_code__iexact=value
                    ).first()
                )

                if designer:
                    return designer

                raise serializers.ValidationError(
                    f"Designer '{value}' not found."
                )

        return super().to_internal_value(data)


# =========================================================
# FULFILMENT LOCATION
# =========================================================

class FlexibleLocationField(serializers.CharField):

    def to_internal_value(self, data):

        mapping = {
            "mumbai fc":
                getattr(Product.FulfilmentLocation, "MUMBAI_FC", "MUMBAI_FC"),

            "mumbai_fc":
                getattr(Product.FulfilmentLocation, "MUMBAI_FC", "MUMBAI_FC"),

            "bengaluru fc":
                getattr(Product.FulfilmentLocation, "BENGALURU_FC", "BENGALURU_FC"),

            "bengaluru_fc":
                getattr(Product.FulfilmentLocation, "BENGALURU_FC", "BENGALURU_FC"),

            "bangalore fc":
                getattr(Product.FulfilmentLocation, "BANGALORE_FC", "BANGALORE_FC"),

            "bangalore_fc":
                getattr(Product.FulfilmentLocation, "BANGALORE_FC", "BANGALORE_FC"),

            "kochi fc":
                getattr(Product.FulfilmentLocation, "KOCHI_FC", "KOCHI_FC"),

            "kochi_fc":
                getattr(Product.FulfilmentLocation, "KOCHI_FC", "KOCHI_FC"),

            "chennai fc":
                getattr(Product.FulfilmentLocation, "CHENNAI_FC", "CHENNAI_FC"),

            "chennai_fc":
                getattr(Product.FulfilmentLocation, "CHENNAI_FC", "CHENNAI_FC"),

            "delhi fc":
                getattr(Product.FulfilmentLocation, "DELHI_FC", "DELHI_FC"),

            "delhi_fc":
                getattr(Product.FulfilmentLocation, "DELHI_FC", "DELHI_FC"),

            "designer studio":
                getattr(Product.FulfilmentLocation, "DESIGNER_STUDIO", "DESIGNER_STUDIO"),

            "designer_studio":
                getattr(Product.FulfilmentLocation, "DESIGNER_STUDIO", "DESIGNER_STUDIO"),
        }

        clean_key = str(data).strip().lower()

        if clean_key in mapping:
            return mapping[clean_key]

        return super().to_internal_value(data)


# =========================================================
# SIZE FIELD
# =========================================================

class FlexibleSizeField(serializers.CharField):

    def to_internal_value(self, data):

        mapping = {
            "xs": Product.Size.XS,
            "s": Product.Size.S,
            "m": Product.Size.M,
            "l": Product.Size.L,
            "xl": Product.Size.XL,
            "xxl": Product.Size.XXL,
            "free": Product.Size.FREE,
            "free size": Product.Size.FREE,
        }

        clean_key = str(data).strip().lower()

        if clean_key in mapping:
            return mapping[clean_key]

        return super().to_internal_value(data)


# =========================================================
# RETURN POLICY
# =========================================================

class FlexibleReturnPolicyField(serializers.CharField):

    def to_internal_value(self, data):

        if data is True:
            return Product.ReturnPolicy.RETURNABLE

        if data is False:
            return Product.ReturnPolicy.FINAL_SALE

        value = str(data).strip().lower()

        if value in [
            "true",
            "1",
            "yes",
            "returnable",
        ]:
            return Product.ReturnPolicy.RETURNABLE

        if value in [
            "false",
            "0",
            "no",
            "final_sale",
            "final sale",
        ]:
            return Product.ReturnPolicy.FINAL_SALE

        return super().to_internal_value(data)


# =========================================================
# PRODUCT IMAGE SERIALIZER
# =========================================================

class ProductImageSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProductImage

        fields = [
            "id",
            "position",
        ]

        read_only_fields = [
            "id",
            "position",
        ]


# =========================================================
# PRODUCT SIZE STOCK SERIALIZER
# =========================================================

class ProductSizeStockSerializer(
    serializers.ModelSerializer
):

    total_quantity = serializers.ReadOnlyField()

    class Meta:
        model = ProductSizeStock

        fields = [
            "id",
            "size",
            "online_quantity",
            "offline_quantity",
            "total_quantity",
        ]

        read_only_fields = [
            "id",
            "total_quantity",
        ]

    def validate_size(self, value):

        valid_sizes = {
            choice[0]
            for choice in Product.Size.choices
        }

        value = str(value).strip().upper()

        if value not in valid_sizes:
            raise serializers.ValidationError(
                "Invalid product size."
            )

        return value

    def validate_online_quantity(self, value):

        if value < 0:
            raise serializers.ValidationError(
                "Online quantity cannot be negative."
            )

        return value

    def validate_offline_quantity(self, value):

        if value < 0:
            raise serializers.ValidationError(
                "Offline quantity cannot be negative."
            )

        return value


# =========================================================
# PRODUCT SERIALIZER
# =========================================================

class ProductSerializer(serializers.ModelSerializer):

    # -----------------------------------------------------
    # Designer
    # -----------------------------------------------------

    designer = FlexibleDesignerField(
        queryset=Vendor.objects.all()
    )

    designer_name = serializers.ReadOnlyField(
        source="designer.designer_name"
    )

    designer_brand = serializers.ReadOnlyField(
        source="designer.brand_name"
    )

    designer_code = serializers.ReadOnlyField(
        source="designer.designer_code"
    )

    # -----------------------------------------------------
    # Flexible fields
    # -----------------------------------------------------

    fulfilment_location = FlexibleLocationField(
        required=False,
        default=Product.FulfilmentLocation.MUMBAI_FC,
    )

    size = FlexibleSizeField(
        required=False,
        allow_null=True,
        allow_blank=True,
    )

    return_policy = FlexibleReturnPolicyField(
        required=False,
        default=Product.ReturnPolicy.RETURNABLE,
    )

    # -----------------------------------------------------
    # SIZE STOCK
    # -----------------------------------------------------

    size_stocks = ProductSizeStockSerializer(
        many=True,
        required=False,
    )

    # -----------------------------------------------------
    # Calculated inventory
    # -----------------------------------------------------

    online_quantity = serializers.ReadOnlyField()

    offline_quantity = serializers.ReadOnlyField()

    total_size_quantity = serializers.ReadOnlyField()

    selected_sizes = serializers.ReadOnlyField()

    size_stock_summary = serializers.ReadOnlyField()

    # -----------------------------------------------------
    # Other calculated fields
    # -----------------------------------------------------

    discount_amount = serializers.ReadOnlyField()
    stock_status = serializers.ReadOnlyField()
    is_fast_delivery = serializers.ReadOnlyField()
    available_quantity = serializers.ReadOnlyField()
    physical_quantity = serializers.ReadOnlyField()
    units_sold = serializers.ReadOnlyField()
    days_of_stock = serializers.ReadOnlyField()
    qa_status = serializers.ReadOnlyField()

    # -----------------------------------------------------
    # Uploaded images
    # -----------------------------------------------------

    images = serializers.ListField(
        child=serializers.ImageField(
            allow_empty_file=False
        ),
        write_only=True,
        required=False,
    )

    # -----------------------------------------------------
    # Existing images
    # -----------------------------------------------------

    product_images = serializers.SerializerMethodField()

    def get_product_images(self, product):

        request = self.context.get("request")

        result = []

        for image in product.product_images.all():

            image_url = None

            try:
                image_url = f"/api/products/media-files/original/{image.pk}/" if image.image else None
            except Exception:
                image_url = None

            if (
                image_url
                and request is not None
            ):
                image_url = (
                    request.build_absolute_uri(
                        image_url
                    )
                )

            result.append({
                "id": image.id,
                "position": image.position,
                "image": image_url,
            })

        return result

    # =====================================================
    # INPUT NORMALIZATION
    # =====================================================

    def to_internal_value(self, data):

        if hasattr(data, "dict"):
            data_copy = data.dict()
        else:
            data_copy = dict(data)

        # -------------------------------------------------
        # SIZE STOCK JSON FROM FormData
        # -------------------------------------------------

        size_stocks = data_copy.get(
            "size_stocks"
        )

        if isinstance(size_stocks, str):

            try:
                data_copy["size_stocks"] = (
                    json.loads(size_stocks)
                )

            except (
                json.JSONDecodeError,
                TypeError,
            ):
                raise serializers.ValidationError({
                    "size_stocks": (
                        "Invalid size stock JSON."
                    )
                })

        # -------------------------------------------------
        # Frontend aliases
        # -------------------------------------------------

        if (
            "name" in data_copy
            and
            "product_name" not in data_copy
        ):
            data_copy["product_name"] = (
                data_copy["name"]
            )

        if (
            "price" in data_copy
            and
            "selling_price" not in data_copy
        ):
            data_copy["selling_price"] = (
                data_copy["price"]
            )

        if (
            "fabric" in data_copy
            and
            "material" not in data_copy
        ):
            data_copy["material"] = (
                data_copy["fabric"]
            )

        if (
            "petSafety" in data_copy
            and
            "pet_safety" not in data_copy
        ):
            data_copy["pet_safety"] = (
                data_copy["petSafety"]
            )

        if (
            "location" in data_copy
            and
            "fulfilment_location"
            not in data_copy
        ):
            data_copy[
                "fulfilment_location"
            ] = data_copy["location"]

        if (
            "fastDelivery" in data_copy
            and
            "fast_delivery" not in data_copy
        ):
            data_copy["fast_delivery"] = (
                data_copy["fastDelivery"]
            )

        if (
            "returnable" in data_copy
            and
            "return_policy" not in data_copy
        ):

            value = data_copy[
                "returnable"
            ]

            data_copy["return_policy"] = (
                Product.ReturnPolicy.RETURNABLE
                if str(value).lower() in [
                    "true",
                    "1",
                    "yes",
                    "returnable",
                ]
                else
                Product.ReturnPolicy.FINAL_SALE
            )

        if (
            "designerId" in data_copy
            and
            "designer" not in data_copy
        ):
            data_copy["designer"] = (
                data_copy["designerId"]
            )

        if (
            "gstRate" in data_copy
            and
            "gst_rate" not in data_copy
        ):
            data_copy["gst_rate"] = (
                data_copy["gstRate"]
            )

        if (
            "weightG" in data_copy
            and
            "weight_g" not in data_copy
        ):
            data_copy["weight_g"] = (
                data_copy["weightG"]
            )

        if (
            "altText" in data_copy
            and
            "alt_text" not in data_copy
        ):
            data_copy["alt_text"] = (
                data_copy["altText"]
            )

        if (
            "seoTitle" in data_copy
            and
            "seo_title" not in data_copy
        ):
            data_copy["seo_title"] = (
                data_copy["seoTitle"]
            )

        if (
            "seoDescription" in data_copy
            and
            "seo_description"
            not in data_copy
        ):
            data_copy[
                "seo_description"
            ] = data_copy[
                "seoDescription"
            ]

        if (
            "newArrival" in data_copy
            and
            "new_arrival" not in data_copy
        ):
            data_copy["new_arrival"] = (
                data_copy["newArrival"]
            )

        if (
            "limitedEdition" in data_copy
            and
            "limited_edition"
            not in data_copy
        ):
            data_copy[
                "limited_edition"
            ] = data_copy[
                "limitedEdition"
            ]

        if (
            "qaScores" in data_copy
            and
            "qa_scores" not in data_copy
        ):
            data_copy["qa_scores"] = (
                data_copy["qaScores"]
            )

        if (
            "qaNote" in data_copy
            and
            "qa_note" not in data_copy
        ):
            data_copy["qa_note"] = (
                data_copy["qaNote"]
            )

        # -------------------------------------------------
        # Ignore frontend-only helper fields
        # -------------------------------------------------

        data_copy.pop(
            "sizes",
            None,
        )

        data_copy.pop(
            "online_quantity",
            None,
        )

        data_copy.pop(
            "offline_quantity",
            None,
        )

        return super().to_internal_value(
            data_copy
        )

    # =====================================================
    # VALIDATION
    # =====================================================

    def validate(self, attrs):
        from .ownership import request_vendor_id
        request = self.context.get("request")
        vendor_id = request_vendor_id(request) if request else None
        if vendor_id is not None:
            designer = attrs.get("designer", getattr(self.instance, "designer", None))
            if designer is None or designer.pk != vendor_id:
                raise serializers.ValidationError({"designer": "You can only manage products belonging to your vendor account."})

        mrp = attrs.get(
            "mrp",
            getattr(
                self.instance,
                "mrp",
                Decimal("0"),
            ),
        )

        selling_price = attrs.get(
            "selling_price",
            getattr(
                self.instance,
                "selling_price",
                Decimal("0"),
            ),
        )

        # -------------------------------------------------
        # PRICE VALIDATION
        # -------------------------------------------------

        if (
            mrp is not None
            and
            selling_price is not None
            and
            selling_price > mrp
        ):
            raise serializers.ValidationError({
                "selling_price": (
                    "Selling price cannot be "
                    "greater than MRP."
                )
            })

        # -------------------------------------------------
        # DISCOUNT
        # -------------------------------------------------

        if (
            mrp is not None
            and
            mrp > Decimal("0")
            and
            selling_price is not None
        ):

            calculated_discount = (
                (
                    Decimal(str(mrp))
                    -
                    Decimal(
                        str(selling_price)
                    )
                )
                /
                Decimal(str(mrp))
            ) * Decimal("100")

            attrs[
                "discount_percentage"
            ] = calculated_discount.quantize(
                Decimal("0.01")
            )

        elif mrp is not None:

            attrs[
                "discount_percentage"
            ] = Decimal("0")

        # -------------------------------------------------
        # IMAGE VALIDATION
        # -------------------------------------------------

        if self.instance is None:

            images = attrs.get(
                "images",
                [],
            )

            if not 1 <= len(images) <= 4:

                raise serializers.ValidationError({
                    "images": (
                        "Between 1 and 4 product "
                        "images are required."
                    )
                })

            for image in images:

                if (
                    image.size
                    >
                    5 * 1024 * 1024
                ):
                    raise serializers.ValidationError({
                        "images": (
                            "Each image must be "
                            "5 MB or smaller."
                        )
                    })

        # -------------------------------------------------
        # SIZE STOCK VALIDATION
        # -------------------------------------------------

        size_stocks = attrs.get(
            "size_stocks"
        )

        sales_channel = attrs.get(
            "sales_channel",
            getattr(
                self.instance,
                "sales_channel",
                Product.SalesChannel.ONLINE,
            ),
        )

        if self.instance is None:

            if not size_stocks:

                raise serializers.ValidationError({
                    "size_stocks": (
                        "Select at least one size "
                        "and enter its quantity."
                    )
                })

        if size_stocks is not None:
            has_online = any(
                int(item.get("online_quantity", 0) or 0) > 0
                for item in size_stocks
            )
            has_offline = any(
                int(item.get("offline_quantity", 0) or 0) > 0
                for item in size_stocks
            )

            # Auto-align sales_channel if size_stocks contains offline / online stock
            if has_online and has_offline:
                sales_channel = Product.SalesChannel.BOTH
                attrs["sales_channel"] = Product.SalesChannel.BOTH
            elif has_offline and not has_online:
                sales_channel = Product.SalesChannel.OFFLINE
                attrs["sales_channel"] = Product.SalesChannel.OFFLINE
            elif has_online and not has_offline:
                if sales_channel not in [
                    Product.SalesChannel.BOTH,
                    Product.SalesChannel.OFFLINE,
                ]:
                    sales_channel = Product.SalesChannel.ONLINE
                    attrs["sales_channel"] = Product.SalesChannel.ONLINE

            used_sizes = set()

            total_quantity = 0

            for item in size_stocks:

                size = item.get("size")

                online = int(
                    item.get(
                        "online_quantity",
                        0,
                    )
                )

                offline = int(
                    item.get(
                        "offline_quantity",
                        0,
                    )
                )

                if size in used_sizes:

                    raise serializers.ValidationError({
                        "size_stocks": (
                            f"Size {size} was "
                            "provided more than once."
                        )
                    })

                used_sizes.add(size)

                if (
                    sales_channel
                    ==
                    Product.SalesChannel.ONLINE
                    and
                    offline > 0
                ):
                    raise serializers.ValidationError({
                        "size_stocks": (
                            f"Size {size}: offline "
                            "quantity must be 0 for "
                            "an online-only product."
                        )
                    })

                if (
                    sales_channel
                    ==
                    Product.SalesChannel.OFFLINE
                    and
                    online > 0
                ):
                    raise serializers.ValidationError({
                        "size_stocks": (
                            f"Size {size}: online "
                            "quantity must be 0 for "
                            "an offline-only product."
                        )
                    })

                total_quantity += (
                    online + offline
                )

            if total_quantity <= 0:

                raise serializers.ValidationError({
                    "size_stocks": (
                        "Total product quantity "
                        "must be greater than 0."
                    )
                })

        return attrs

    # =====================================================
    # CREATE
    # =====================================================

    @transaction.atomic
    def create(
        self,
        validated_data,
    ):

        images = validated_data.pop(
            "images",
            [],
        )

        size_stocks = validated_data.pop(
            "size_stocks",
            [],
        )

        # -------------------------------------------------
        # LEGACY SIZE
        # -------------------------------------------------

        if (
            not validated_data.get("size")
            and
            size_stocks
        ):
            validated_data["size"] = (
                size_stocks[0]["size"]
            )

        # -------------------------------------------------
        # INVENTORY IS CALCULATED FROM SIZE STOCK
        # -------------------------------------------------

        total_inventory = sum(
            int(
                item.get(
                    "online_quantity",
                    0,
                )
            )
            +
            int(
                item.get(
                    "offline_quantity",
                    0,
                )
            )
            for item in size_stocks
        )

        validated_data[
            "inventory_quantity"
        ] = total_inventory

        # -------------------------------------------------
        # CREATE PRODUCT
        # -------------------------------------------------

        product = Product.objects.create(
            **validated_data
        )

        # -------------------------------------------------
        # CREATE SIZE STOCK
        # -------------------------------------------------

        for item in size_stocks:

            ProductSizeStock.objects.create(
                product=product,

                size=item["size"],

                online_quantity=item.get(
                    "online_quantity",
                    0,
                ),

                offline_quantity=item.get(
                    "offline_quantity",
                    0,
                ),
            )

        # -------------------------------------------------
        # CREATE EXACTLY 4 IMAGES
        # -------------------------------------------------

        for position, image in enumerate(
            images,
            start=1,
        ):

            ProductImage.objects.create(
                product=product,
                position=position,
                image=image,
            )

        # -------------------------------------------------
        # PRIMARY IMAGE
        # -------------------------------------------------

        first_image = (
            product.product_images
            .filter(position=1)
            .first()
        )

        if first_image:

            product.primary_image = (
                first_image.image
            )

            product.save(
                update_fields=[
                    "primary_image",
                ]
            )

        return product

    # =====================================================
    # UPDATE
    # =====================================================

    @transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):

        # Existing image replacement is not performed
        # through this normal update endpoint.
        validated_data.pop(
            "images",
            None,
        )

        size_stocks = validated_data.pop(
            "size_stocks",
            None,
        )

        # -------------------------------------------------
        # NORMAL PRODUCT FIELDS
        # -------------------------------------------------

        for attr, value in validated_data.items():

            setattr(
                instance,
                attr,
                value,
            )

        # -------------------------------------------------
        # SIZE STOCK
        # -------------------------------------------------

        if size_stocks is not None:

            supplied_sizes = []

            total_inventory = 0

            for item in size_stocks:

                size = item["size"]

                online_quantity = int(
                    item.get(
                        "online_quantity",
                        0,
                    )
                )

                offline_quantity = int(
                    item.get(
                        "offline_quantity",
                        0,
                    )
                )

                supplied_sizes.append(
                    size
                )

                ProductSizeStock.objects.update_or_create(
                    product=instance,
                    size=size,

                    defaults={
                        "online_quantity":
                            online_quantity,

                        "offline_quantity":
                            offline_quantity,
                    },
                )

                total_inventory += (
                    online_quantity
                    +
                    offline_quantity
                )

            instance.size_stocks.exclude(
                size__in=supplied_sizes
            ).delete()

            instance.inventory_quantity = (
                total_inventory
            )

            if (
                supplied_sizes
                and
                not instance.size
            ):
                instance.size = (
                    supplied_sizes[0]
                )

        instance.save()

        return instance

    # =====================================================
    # REPRESENTATION
    # =====================================================

    def to_representation(
        self,
        instance,
    ):

        res = super().to_representation(
            instance
        )

        res["gstRate"] = (
            float(instance.gst_rate)
            if instance.gst_rate is not None
            else 12.0
        )

        res["weightG"] = (
            instance.weight_g
        )

        res["altText"] = (
            instance.alt_text
        )

        res["seoTitle"] = (
            instance.seo_title
        )

        res["seoDescription"] = (
            instance.seo_description
        )

        res["newArrival"] = (
            instance.new_arrival
        )

        res["limitedEdition"] = (
            instance.limited_edition
        )

        res["petSafety"] = (
            instance.pet_safety
        )

        res["fabric"] = (
            instance.material
        )

        res["location"] = (
            instance.fulfilment_location
        )

        res["fastDelivery"] = (
            instance.fast_delivery
        )

        res["returnable"] = (
            instance.return_policy
            ==
            Product.ReturnPolicy.RETURNABLE
        )

        res["live"] = (
            instance.is_live
            or
            instance.status
            ==
            Product.ProductStatus.LIVE
        )

        res["qaStatus"] = (
            instance.status
        )

        res["qaScore"] = (
            instance.qa_score
        )

        res["qaScores"] = (
            instance.qa_scores
            if instance.qa_scores
            else {}
        )

        res["qaNote"] = (
            instance.qa_note
            if instance.qa_note
            else ""
        )

        res["name"] = (
            instance.product_name
        )

        res["price"] = (
            float(
                instance.selling_price
            )
            if instance.selling_price
            is not None
            else 0.0
        )

        return res

    # =====================================================
    # META
    # =====================================================

    class Meta:

        model = Product

        fields = [
            "id",

            # Basic
            "product_name",
            "sku",
            "description",

            # Designer
            "designer",
            "designer_name",
            "designer_brand",
            "designer_code",

            # Classification
            "category",
            "subcategory",

            # Attributes
            "colour",
            "size",
            "material",
            "pet_safety",

            # Multiple sizes
            "size_stocks",
            "selected_sizes",

            # Sales channel
            "sales_channel",

            # Compliance
            "barcode",
            "hsn",
            "gst_rate",
            "weight_g",
            "dimensions",
            "origin",
            "manufacturer",

            # Care
            "care",

            # Media
            "image",
            "video",
            "alt_text",

            # SEO
            "seo_title",
            "seo_description",
            "keywords",

            # Discovery
            "collection",
            "occasion",
            "season",

            # Flags
            "bestseller",
            "new_arrival",
            "featured",
            "limited_edition",

            # Pricing
            "mrp",
            "selling_price",
            "discount_percentage",

            # Inventory
            "inventory_quantity",
            "reserved_quantity",
            "damaged_quantity",
            "quarantined_quantity",
            "in_transit_quantity",
            "returned_quantity",

            # Size inventory totals
            "online_quantity",
            "offline_quantity",
            "total_size_quantity",
            "size_stock_summary",

            # Calculated inventory
            "available_quantity",
            "physical_quantity",
            "units_sold",
            "days_of_stock",

            # QA
            "qa_status",
            "qa_score",
            "qa_scores",
            "qa_note",

            # Stock
            "low_stock_threshold",

            # Fulfilment
            "fulfilment_location",
            "fast_delivery",

            # Return
            "return_policy",

            # Status
            "status",
            "is_active",
            "is_live",

            # Images
            "primary_image",
            "images",
            "product_images",

            # Dates
            "created_at",
            "updated_at",

            # Calculated
            "discount_amount",
            "stock_status",
            "is_fast_delivery",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",

            "designer_name",
            "designer_brand",
            "designer_code",

            "online_quantity",
            "offline_quantity",
            "total_size_quantity",
            "selected_sizes",
            "size_stock_summary",

            "available_quantity",
            "physical_quantity",
            "units_sold",
            "days_of_stock",

            "qa_status",

            "discount_amount",
            "stock_status",
            "is_fast_delivery",

            "product_images",
        ]
