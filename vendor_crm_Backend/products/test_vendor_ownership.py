from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from accounts.models import Role, UserRole
from vendors.models import Vendor
from products.models import Product, ProductImage, MediaJob


class VendorProductOwnershipTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = get_user_model().objects.create_user(username="product-owner")
        role, _ = Role.objects.get_or_create(name="Vendor")
        UserRole.objects.create(user=self.owner, role=role)
        self.vendor = Vendor.objects.create(user=self.owner, vendor_name="Owner", brand_name="Own Brand")
        self.other = Vendor.objects.create(vendor_name="Other", brand_name="Other Brand")
        self.products = []
        for vendor in [self.vendor, self.other]:
            product = Product.objects.create(designer=vendor, sku=f"OWN-{vendor.pk}", product_name=vendor.brand_name, mrp=100, selling_price=90)
            ProductImage.objects.create(product=product, image="test/original.png", position=1)
            MediaJob.objects.create(product=product, status="IN_REVIEW", sent_at=timezone.now())
            self.products.append(product)
        self.client.force_authenticate(self.owner)

    def test_vendor_list_and_filters_never_include_other_vendors(self):
        response = self.client.get("/api/products/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.data], [self.products[0].pk])
        self.assertEqual(self.client.get("/api/products/", {"designer": self.other.pk}).data, [])

    def test_other_product_cannot_be_viewed_edited_or_adjusted(self):
        url = f"/api/products/{self.products[1].pk}/"
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.patch(url, {"selling_price": 80}, format="json").status_code, 404)
        self.assertEqual(self.client.post(url + "adjust_stock/", {"action": "add", "quantity": 1}, format="json").status_code, 404)
        self.assertEqual(self.client.get(f"/api/products/{self.products[0].pk}/").status_code, 200)

    def test_vendor_cannot_reassign_own_product(self):
        response = self.client.patch(f"/api/products/{self.products[0].pk}/", {"designer": self.other.pk}, format="json")
        self.assertEqual(response.status_code, 400)
        self.products[0].refresh_from_db()
        self.assertEqual(self.products[0].designer_id, self.vendor.pk)

    def test_media_queue_and_review_are_scoped_to_vendor(self):
        for params in [{}, {"vendor": self.vendor.pk}, {"designer": self.vendor.pk}]:
            response = self.client.get("/api/products/media/", params)
            self.assertEqual([row["id"] for row in response.data], [self.products[0].pk])
        self.assertEqual(self.client.get("/api/products/media/", {"vendor": self.other.pk}).data, [])
        response = self.client.post(f"/api/products/{self.products[1].pk}/media/", {"action": "approve"}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_admin_keeps_access_to_all_products(self):
        admin = get_user_model().objects.create_user(username="product-admin", is_superuser=True)
        self.client.force_authenticate(admin)
        self.assertEqual(len(self.client.get("/api/products/").data), 2)

    def test_unlinked_vendor_role_has_no_product_access(self):
        unlinked = get_user_model().objects.create_user(username="unlinked-vendor")
        UserRole.objects.create(user=unlinked, role=self.owner.user_role.role)
        self.client.force_authenticate(unlinked)
        self.assertEqual(self.client.get("/api/products/").data, [])
