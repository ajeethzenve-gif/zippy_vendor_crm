from django.test import TestCase
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import Vendor
from credits.models import OnlineVendorCredit
from unittest.mock import patch
from django.db import IntegrityError


class VendorRegistrationTests(TestCase):
    def test_vendor_plan_catalogue_and_validation(self):
        plan = OnlineVendorCredit.objects.get(code="SILVER")
        response = self.client.get("/api/credits/vendor-plans/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([p["credit_points"] for p in response.data], [200000, 375000, 500000])
        self.assertEqual([p["sku_limit"] for p in response.data], [24, 49, 65])
        self.assertFalse(OnlineVendorCredit.objects.get(code="PALLADIUM").is_active)
        plan.is_active = False
        plan.save()
        self.assertNotIn(plan.pk, [p["id"] for p in self.client.get("/api/credits/vendor-plans/").data])
        base = dict(vendor_name="Nisha", brand_name="Pets", email="crm@example.com")
        for plan_id in [plan.pk, 999999]:
            response = self.client.post("/api/vendors/", {**base, "plan_type": plan_id}, format="json")
            self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(Vendor.objects.exists())

    def test_plan_change_uses_database_points_and_can_be_cleared(self):
        plan = OnlineVendorCredit.objects.create(code="CUSTOM", name="Custom", credit_points=123456)
        response = self.client.post("/api/vendors/", dict(vendor_name="Nisha", brand_name="Pets", email="crm@example.com", plan_type=plan.pk, credit_points=1), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        vendor = Vendor.objects.get()
        self.assertEqual(vendor.credit_points, 123456)
        self.assertEqual(response.data["plan_details"]["name"], "Custom")
        self.client.patch(f"/api/vendors/{vendor.pk}/", {"city": "Pune"}, format="json")
        vendor.refresh_from_db()
        self.assertEqual(vendor.credit_points, 123456)
        response = self.client.patch(f"/api/vendors/{vendor.pk}/", {"plan_type": None}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        vendor.refresh_from_db()
        self.assertIsNone(vendor.plan_type_id)
        self.assertIsNone(vendor.online_membership_plan)
        self.assertEqual(vendor.credit_points, 0)

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.payload = dict(owner_name="Aditi Sharma", brand_name="Happy Paws", email="ADITI@example.com", phone="+919876543210", city="Pune", primary_category="Pet accessories", password="River!Cobalt82Moon")

    def register(self, **changes):
        return self.client.post("/api/vendors/register/", {**self.payload, **changes}, format="json")

    def test_registration_creates_account_and_pending_crm_record(self):
        response = self.register(stage="LIVE", is_staff=True)
        self.assertEqual(response.status_code, 201, response.data)
        vendor = Vendor.objects.get()
        self.assertEqual(vendor.email, "aditi@example.com")
        self.assertTrue(vendor.user.check_password(self.payload["password"]))
        self.assertFalse(vendor.user.is_staff)
        self.assertEqual(vendor.user.user_role.role.name, "Vendor")
        self.assertEqual(vendor.stage, "LEAD")
        self.assertEqual(vendor.kyc_status, "PENDING")
        self.assertIsNone(vendor.legacy_designer_id)
        self.assertNotIn("password", response.data)

    def test_duplicate_email_is_case_insensitive(self):
        self.register()
        self.assertEqual(self.register(email="aditi@example.com", phone="+919876543211").status_code, 400)
        self.assertEqual(Vendor.objects.count(), 1)

    def test_duplicate_phone_does_not_create_extra_account(self):
        self.register()
        self.assertEqual(self.register(email="other@example.com").status_code, 400)
        self.assertEqual(get_user_model().objects.count(), 1)

    def test_invalid_and_missing_fields(self):
        for values in [{"password": "123"}, {"phone": "abc"}, {"email": "invalid"}, {"brand_name": " "}]:
            self.assertEqual(self.register(**values).status_code, 400)
        self.assertEqual(self.client.post("/api/vendors/register/", {}, format="json").status_code, 400)
        self.assertFalse(Vendor.objects.exists())

    def test_transaction_rolls_back_on_failure(self):
        with patch("vendors.serializers.Vendor.objects.create", side_effect=IntegrityError):
            self.assertEqual(self.register().status_code, 400)
        self.assertFalse(get_user_model().objects.exists())

    def test_endpoint_does_not_expose_registration_list(self):
        self.assertEqual(self.client.get("/api/vendors/register/").status_code, 405)

    def test_extended_details_are_saved_and_shared_with_crm(self):
        details = dict(legal_business_name="Happy Paws Trading", business_type="COMPANY", alternate_phone="+919876543212", address_line1="12 Park Road", address_line2="Near Central Market", state="Maharashtra", country="India", postal_code="411001", gst_number="27abcde1234f1z5", website="https://example.com", instagram_url="https://instagram.com/example", business_description="Pet accessories and supplies")
        response = self.register(**details)
        self.assertEqual(response.status_code, 201, response.data)
        vendor = Vendor.objects.get()
        for name, value in details.items():
            self.assertEqual(getattr(vendor, name), value.upper() if name == "gst_number" else value)
        self.assertEqual(vendor.gst_number, "27ABCDE1234F1Z5")
        self.assertEqual(vendor.state, "Maharashtra")
        self.assertEqual(vendor.website, details["website"])
        self.assertEqual(vendor.business_description, details["business_description"])

    def test_invalid_extended_details_are_rejected(self):
        for values in [{"gst_number": "invalid"}, {"business_type": "UNKNOWN"}, {"alternate_phone": "abc"}, {"website": "invalid"}, {"postal_code": "!@#"}, {"business_description": "x" * 2001}]:
            with self.subTest(values=values):
                response = self.register(**values)
                self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(Vendor.objects.exists())

    def test_optional_details_accept_blank_values(self):
        response = self.register(gst_number="", alternate_phone="", website="", business_type="", postal_code="")
        self.assertEqual(response.status_code, 201, response.data)

    def test_vendor_credits_are_online_only(self):
        from credits.models import DesignerCreditWallet, DesignerCreditStatement
        from credits.views import get_designer_credits_data
        self.register()
        vendor = Vendor.objects.get()
        record = vendor
        record.credit_points = 100000
        record.save()
        wallet = DesignerCreditWallet.objects.create(designer=record, online_credits=100000, offline_credits=300000)
        DesignerCreditStatement.objects.create(wallet=wallet, designer=record, channel="OFFLINE", points=-5000, description="Historical offline usage")
        data = get_designer_credits_data(record)
        self.assertEqual(data["wallet"]["total_balance"], 100000)
        self.assertEqual(data["wallet"]["points_used"], 0)
        self.assertNotIn("offline_credits", data["wallet"])
        self.assertNotIn("offline_plans", data)
        self.assertEqual(data["statements"], [])
        response = self.client.post("/api/credits/buy-offline-pack/", {"designer_id": record.id, "plan_id": 1}, format="json")
        self.assertEqual(response.status_code, 400)
        wallet.refresh_from_db()
        self.assertEqual(wallet.offline_credits, 300000)

    def test_crm_form_writes_only_vendor_table(self):
        payload = dict(vendor_name="Nisha", brand_name="Pet Store", email="crm@example.com", phone="+919123456789", city="Pune", primary_category="Pet accessories", lead_source="Instagram", sales_owner="Nisha Kapoor", next_followup_date="2026-10-01", tier="PREMIUM", plan_type=OnlineVendorCredit.objects.get(code="SILVER").pk, credit_points=1, take_rate="24.00", acquisition_cost="100.00", renewal_likelihood=80, contract_end_date="2027-10-01", gst_number="")
        response = self.client.post("/api/vendors/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        vendor = Vendor.objects.get()
        self.assertEqual(vendor.vendor_name, "Nisha")
        self.assertEqual(vendor.credit_points, 200000)
        self.assertEqual(str(vendor.next_followup_date), "2026-10-01")
        self.assertIsNone(vendor.user_id)
        self.assertIsNone(vendor.legacy_designer_id)
        response = self.client.patch(f"/api/vendors/{vendor.id}/", {"sales_owner": "Sana Qureshi", "plan_type": OnlineVendorCredit.objects.get(code="GOLD").pk, "credit_points": 1}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        vendor.refresh_from_db()
        self.assertEqual(vendor.credit_points, 375000)
        self.assertEqual(vendor.sales_owner, "Sana Qureshi")
        self.assertEqual(self.client.get("/api/vendors/").data[0]["vendor_name"], "Nisha")

    def test_crm_form_rejects_invalid_values(self):
        base = dict(vendor_name="Nisha", brand_name="Pet Store", email="crm@example.com")
        for values in [{"take_rate": 101}, {"renewal_likelihood": 101}, {"acquisition_cost": -1}, {"tier": "INVALID"}, {"lead_source": "INVALID"}]:
            response = self.client.post("/api/vendors/", {**base, **values}, format="json")
            self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(Vendor.objects.exists())



class VendorIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(username="portal", email="portal@example.com", password="River!Cobalt82Moon")
        self.vendor = Vendor.objects.create(user=self.user, vendor_name="Portal Owner", brand_name="Pet Brand", email=self.user.email, credit_points=200000)

    def test_portal_and_operational_endpoints(self):
        from products.models import Product
        from orders.models import Order, OrderItem, Settlement
        product = Product.objects.create(designer=self.vendor, sku="VENDOR-TEST", product_name="Pet bowl", mrp=100, selling_price=100, status="APPROVED", inventory_quantity=10)
        order = Order.objects.create(order_status="Delivered")
        item = OrderItem.objects.create(order=order, product_id=str(product.pk), product_name=product.product_name, quantity=2, price=100)
        Settlement.objects.create(order=order, order_item=item, designer=self.vendor, gmv=200, payout_amount=180, commission_amount=20)
        other = Vendor.objects.create(vendor_name="Other", brand_name="Other", email="other@example.com")
        Product.objects.create(designer=other, sku="OTHER", product_name="Other product", mrp=100, selling_price=100)
        response = self.client.get(f"/api/vendors/{self.vendor.pk}/portal-dashboard/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data["skus"]), 1)
        self.assertTrue(all(isinstance(action, str) for action in response.data["pendingActions"]))
        self.assertEqual(response.data["skus"][0]["units_sold"], 2)
        self.assertEqual(response.data["orders"][0]["amount"], 200)
        self.assertEqual(response.data["kpis"]["monthlyGmv"], 200)
        self.assertEqual(response.data["credits"]["wallet"]["total_balance"], 199500)
        self.assertFalse(response.data["notifications"][0]["read"])
        self.assertEqual(self.client.post(f"/api/vendors/{self.vendor.pk}/portal-dashboard/mark-read/").status_code, 200)
        self.assertTrue(self.client.get(f"/api/vendors/{self.vendor.pk}/portal-dashboard/").data["notifications"][0]["read"])
        for url in ["/api/products/", "/api/orders/", "/api/returns/", "/api/settlements/", "/api/analytics/overview/", "/api/command-centre/overview/", f"/api/credits/vendor/{self.vendor.pk}/"]:
            with self.subTest(url=url):
                result = self.client.get(url)
                self.assertEqual(result.status_code, 200, getattr(result, "data", None))
        self.assertEqual(self.client.get("/api/vendors/999999/portal-dashboard/").status_code, 404)

    def test_product_lookup_by_vendor_name_and_code(self):
        from products.serializers import FlexibleDesignerField
        field = FlexibleDesignerField(queryset=Vendor.objects.all())
        for value in [self.vendor.pk, str(self.vendor.pk), self.vendor.brand_name, self.vendor.vendor_name, self.vendor.vendor_code]:
            self.assertEqual(field.to_internal_value(value), self.vendor)
        for query in [self.vendor.vendor_name, self.vendor.vendor_code]:
            self.assertEqual(self.client.get("/api/products/", {"designer": query}).status_code, 200)

    def test_account_ownership_validation_and_persistence(self):
        url = f"/api/vendors/{self.vendor.pk}/account-details/"
        self.assertEqual(self.client.get(url).status_code, 401)
        self.client.force_authenticate(self.user)
        self.assertFalse(self.client.get(url).data["exists"])
        payload = dict(account_holder_name="Portal Owner", account_number="123456789123", ifsc_code="hdfc0001234", pan_number="abcde1234f")
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["data"]["ifsc_code"], "HDFC0001234")
        self.assertTrue(self.client.get(url).data["exists"])
        self.assertEqual(self.client.post(url, {**payload, "account_number": "bad"}, format="json").status_code, 400)
        stranger = get_user_model().objects.create_user(username="stranger", password="River!Cobalt82Moon")
        self.client.force_authenticate(stranger)
        self.assertEqual(self.client.get(url).status_code, 403)

    def test_login_uses_real_credentials(self):
        from accounts.models import Role, UserRole
        role, _ = Role.objects.get_or_create(name="Vendor")
        UserRole.objects.create(user=self.user, role=role)
        payload = {"username": self.user.email.upper(), "password": "River!Cobalt82Moon"}
        response = self.client.post("/api/login/", payload, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["vendor_id"], self.vendor.pk)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + response.data["access"])
        self.assertEqual(self.client.get(f"/api/vendors/{self.vendor.pk}/account-details/").status_code, 200)
        self.assertEqual(self.client.post("/api/login/", {**payload, "password": "incorrect"}, format="json").status_code, 401)

    def test_profile_upload_is_saved_on_vendor(self):
        import tempfile
        from django.test import override_settings
        from products.test_media import image_file
        with tempfile.TemporaryDirectory() as media, override_settings(MEDIA_ROOT=media):
            response = self.client.patch(f"/api/vendors/{self.vendor.pk}/", {"profile_image": image_file()}, format="multipart")
            self.assertEqual(response.status_code, 200, response.data)
            self.assertIn("/media/vendors/profiles/", response.data["profile_image"])
            self.vendor.refresh_from_db()
            self.assertTrue(self.vendor.profile_image.name.startswith("vendors/profiles/"))

    def test_settlement_generation_never_assigns_unknown_products_to_first_vendor(self):
        from orders.models import Order, OrderItem, Settlement
        order = Order.objects.create(order_status='Delivered')
        OrderItem.objects.create(order=order, product_id='missing', product_name='Unlinked item', quantity=1, price=100)
        response = self.client.post('/api/settlements/generate/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(Settlement.objects.exists())

    def test_zero_commission_is_preserved(self):
        from products.models import Product
        from orders.models import Order, OrderItem, Settlement
        product = Product.objects.create(designer=self.vendor, sku='ZERO-RATE', product_name='Bowl', mrp=100, selling_price=100)
        order = Order.objects.create(order_status='Delivered')
        OrderItem.objects.create(order=order, product_id=str(product.pk), product_name='Bowl', quantity=1, price=100)
        self.client.post('/api/settlements/generate/')
        settlement = Settlement.objects.get()
        self.assertEqual(settlement.take_rate, 0)
        self.assertEqual(settlement.commission_amount, 0)
        self.assertEqual(settlement.payout_amount, 100)
