import os
import pymysql
pymysql.install_as_MySQLdb()
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zenvefashion.settings')
django.setup()

from vendors.models import Vendor as Designer
from products.models import Product
from orders.models import Order, OrderItem, Settlement
from decimal import Decimal

designer = Designer.objects.filter(brand_name__icontains="Aarav").first()
if not designer:
    print("Designer not found")
    exit(1)

# Ensure designer is CONTRACT / SIGNED / LIVE
designer.stage = Designer.Stage.LIVE
designer.take_rate = Decimal("28.00")
designer.kyc_status = Designer.KYCStatus.VERIFIED
designer.save()
print(f"Updated designer {designer.brand_name} (ID: {designer.id})")

# Ensure SKUs
sku1, _ = Product.objects.get_or_create(
    sku="ZNV-AAR-POC-DOGKURTA-IVORY-M",
    defaults={
        "product_name": "Ivory Silk Dog Kurta",
        "designer": designer,
        "category": "Pet Occasion Wear",
        "colour": "Ivory",
        "size": Product.Size.M,
        "material": "Pure Raw Silk",
        "pet_safety": "No loose beads. Breathable fabric. Supervised wear recommended.",
        "mrp": Decimal("4500.00"),
        "selling_price": Decimal("3499.00"),
        "inventory_quantity": 14,
        "reserved_quantity": 0,
        "low_stock_threshold": 3,
        "fulfilment_location": Product.FulfilmentLocation.MUMBAI_FC,
        "fast_delivery": True,
        "return_policy": Product.ReturnPolicy.RETURNABLE,
        "status": Product.ProductStatus.APPROVED,
        "is_active": True,
        "is_live": True,
    }
)
print("SKU 1:", sku1.product_name, sku1.sku)

sku2, _ = Product.objects.get_or_create(
    sku="ZNV-AAR-POC-DOGLEHENGA-ROSE-S",
    defaults={
        "product_name": "Rose Zari Dog Lehenga",
        "designer": designer,
        "category": "Pet Occasion Wear",
        "colour": "Rose Gold",
        "size": Product.Size.S,
        "material": "Zari Banarasi Brocade",
        "pet_safety": "Soft velcro fastening. Light padding. No metal hooks.",
        "mrp": Decimal("5200.00"),
        "selling_price": Decimal("4299.00"),
        "inventory_quantity": 8,
        "reserved_quantity": 0,
        "low_stock_threshold": 2,
        "fulfilment_location": Product.FulfilmentLocation.MUMBAI_FC,
        "fast_delivery": True,
        "return_policy": Product.ReturnPolicy.RETURNABLE,
        "status": Product.ProductStatus.LIVE,
        "is_active": True,
        "is_live": True,
    }
)
print("SKU 2:", sku2.product_name, sku2.sku)

# Ensure Order & OrderItem
order, _ = Order.objects.get_or_create(
    order_number="ZNV-ORD-7A9B1C2D",
    defaults={
        "customer_name": "Ananya Roy",
        "customer_email": "ananya.roy@example.com",
        "customer_phone": "+91 98201 12345",
        "delivery_pincode": "400050",
        "delivery_address": "Bandra West, Mumbai",
        "status": Order.OrderStatus.DELIVERED,
        "total_amount": Decimal("6998.00"),
        "is_fast_delivery": True,
    }
)

item, _ = OrderItem.objects.get_or_create(
    order=order,
    product_id=str(sku1.pk),
    defaults={
        "product_name": sku1.product_name,
        "product_data": {"brand_name": designer.brand_name, "sku": sku1.sku},
        "colour": sku1.colour,
        "size": sku1.size,
        "quantity": 2,
        "unit_price": Decimal("3499.00"),
        "total_price": Decimal("6998.00"),
    }
)
print("Order & Item seeded:", order.order_number)

# Ensure Settlement
settlement, _ = Settlement.objects.get_or_create(
    settlement_number="ZNV-STL-9F8E7D6C",
    defaults={
        "order": order,
        "order_item": item,
        "designer": designer,
        "gmv": Decimal("6998.00"),
        "take_rate": Decimal("28.00"),
        "commission_amount": Decimal("1959.44"),
        "payout_amount": Decimal("5038.56"),
        "status": Settlement.SettlementStatus.PAID,
        "payout_reference": "UTR-YESB00091244",
    }
)
print("Settlement seeded:", settlement.settlement_number)
