from django.test import TestCase
from orders.models import Order, OrderItem, Settlement
from orders.serializers import SettlementSerializer
from products.models import Product
from vendors.models import Vendor


class SettlementProductFieldsTests(TestCase):
    def setUp(self):
        self.vendor = Vendor.objects.create(vendor_name="Seller", brand_name="Pet Brand")
        self.product = Product.objects.create(designer=self.vendor, sku="SETTLEMENT-FIELDS", product_name="Bowl", mrp=150, selling_price=120)
        order = Order.objects.create(order_status="Delivered")
        self.item = OrderItem.objects.create(order=order, product_id=str(self.product.pk), product_name="Bowl", quantity=2, price=110)
        self.settlement = Settlement.objects.create(order=order, order_item=self.item, designer=self.vendor, gmv=220, commission_amount=22, payout_amount=198)

    def test_price_comes_from_sale_and_mrp_from_catalogue(self):
        data = SettlementSerializer(self.settlement).data
        self.assertEqual(data["mrp"], "150.00")
        self.assertEqual(data["unit_price"], "110.00")
        self.assertEqual(data["quantity"], 2)
        self.assertEqual(data["product_name"], "Bowl")
        self.assertEqual(data["commission"], 22)

    def test_saved_mrp_takes_precedence_and_missing_product_stays_unknown(self):
        self.item.product_data = {"mrp": "140.00"}
        self.item.save()
        self.assertEqual(SettlementSerializer(self.settlement).data["mrp"], "140.00")
        self.item.product_data = {}
        self.item.product_id = "missing"
        self.item.save()
        self.settlement.refresh_from_db()
        self.assertIsNone(SettlementSerializer(self.settlement).data["mrp"])
