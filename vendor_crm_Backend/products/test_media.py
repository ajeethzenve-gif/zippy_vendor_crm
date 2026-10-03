import tempfile
from io import BytesIO
from PIL import Image
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from vendors.models import Vendor
from .models import Product, ProductImage, MediaAsset, MediaJob, private_storage


def image_file(name="image.png"):
    stream = BytesIO()
    Image.new("RGB", (16, 16), "red").save(stream, format="PNG")
    return SimpleUploadedFile(name, stream.getvalue(), content_type="image/png")


class MediaWorkflowTests(TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.old_location = private_storage._location
        private_storage._location = self.directory.name
        private_storage.__dict__.pop("base_location", None)
        private_storage.__dict__.pop("location", None)
        self.addCleanup(self.restore_storage)
        self.client = APIClient()
        self.designer = Vendor.objects.create(vendor_code="MEDIA-1", vendor_name="Vendor", brand_name="Brand")
        self.product = Product.objects.create(designer=self.designer, sku="MEDIA-SKU", product_name="Dress", mrp=100, selling_price=100)
        for position in range(1, 5):
            ProductImage.objects.create(product=self.product, position=position, image=image_file())
        self.url = f"/api/products/{self.product.pk}/media/"

    def restore_storage(self):
        private_storage._location = self.old_location
        private_storage.__dict__.pop("base_location", None)
        private_storage.__dict__.pop("location", None)
        self.directory.cleanup()

    def test_delivery_revision_and_approval(self):
        queue = self.client.get("/api/products/media/")
        self.assertEqual(queue.status_code, 200)

        self.assertEqual(queue.data[0]["status"], "QUEUED")
        self.assertEqual(len(queue.data[0]["originals"]), 4)
        self.assertEqual(self.client.post(self.url, {"action": "send"}).status_code, 400)
        delivery = self.client.post(self.url, {"action": "send", "images": [image_file()], "figma_url": "https://www.figma.com/design/example"}, format="multipart")
        self.assertEqual(delivery.status_code, 200, delivery.data)
        self.assertEqual(delivery.data["status"], "IN_REVIEW")
        inbox = self.client.get(f"/api/products/media/?designer={self.designer.pk}")
        self.assertEqual(len(inbox.data), 1)
        self.assertEqual(self.client.get(f"/api/products/media/?designer={self.designer.pk + 1}").data, [])
        file_response = self.client.get(f"/api/products/media-files/generated/{MediaAsset.objects.get().pk}/")
        self.assertEqual(file_response.status_code, 200)
        file_response.close()
        self.assertEqual(self.client.post(self.url, {"action": "save"}).status_code, 400)
        self.assertEqual(self.client.post(self.url, {"action": "changes"}).status_code, 400)
        response = self.client.post(self.url, {"action": "changes", "feedback": "Use a lighter background"})
        self.assertEqual(response.data["status"], "CHANGES_REQUESTED")
        self.assertEqual(self.client.post(self.url, {"action": "send", "images": [image_file("revision.png")]}, format="multipart").status_code, 200)
        self.assertEqual(MediaAsset.objects.count(), 1)
        self.assertEqual(self.client.post(self.url, {"action": "approve"}).data["status"], "APPROVED")
        self.assertEqual(self.client.post(self.url, {"action": "send"}).status_code, 400)
        self.assertEqual(self.product.product_images.count(), 4)

    def test_product_card_images_use_readable_private_image_endpoint(self):
        from urllib.parse import urlsplit
        response = self.client.get(f"/api/products/{self.product.pk}/")
        self.assertEqual(response.status_code, 200)
        images = response.data["product_images"]
        self.assertEqual(len(images), 4)
        for image in images:
            path = urlsplit(image["image"]).path
            self.assertEqual(path, f"/api/products/media-files/original/{image['id']}/")
            file_response = self.client.get(path)
            self.assertEqual(file_response.status_code, 200)
            self.assertTrue(b"".join(file_response.streaming_content).startswith(b"\x89PNG"))

    def test_drafts_filters_and_invalid_uploads(self):
        self.assertEqual(self.client.post(self.url, {"action": "save", "images": [image_file()]}, format="multipart").status_code, 200)
        self.assertEqual(self.client.get(f"/api/products/media/?designer={self.designer.pk}").data, [])
        self.assertEqual(self.client.get("/api/products/media/?designer=bad").status_code, 400)
        self.assertEqual(self.client.post(self.url, {"action": "save", "figma_url": "https://evil.test/file"}).status_code, 400)
        fake = SimpleUploadedFile("fake.png", b"not an image", content_type="image/png")
        self.assertEqual(self.client.post(self.url, {"action": "send", "images": [fake]}, format="multipart").status_code, 400)
        self.assertEqual(MediaJob.objects.get().status, "IN_PROGRESS")
        self.product.product_images.all().delete()
        self.assertEqual(self.client.get("/api/products/media/").data, [])
        self.assertEqual(self.client.post(self.url, {"action": "send"}).status_code, 400)

    def test_product_upload_accepts_one_to_four_images(self):
        import json
        for count in range(1, 5):
            with self.subTest(count=count):
                payload = {
                    'designer': self.designer.pk, 'product_name': f'Bowl {count}',
                    'sku': f'UPLOAD-{count}', 'category': 'Pet Accessories',
                    'colour': 'Red', 'size': 'FREE', 'material': 'Cotton',
                    'mrp': '100.00', 'selling_price': '90.00',
                    'fulfilment_location': 'MUMBAI_FC', 'return_policy': 'RETURNABLE',
                    'size_stocks': json.dumps([{'size': 'FREE', 'online_quantity': 5, 'offline_quantity': 0}]),
                    'images': [image_file(f'photo-{i}.png') for i in range(count)],
                }
                response = self.client.post('/api/products/', payload, format='multipart')
                self.assertEqual(response.status_code, 201, response.data)
                product = Product.objects.get(pk=response.data['id'])
                self.assertEqual(product.product_images.count(), count)
                self.assertEqual(list(product.product_images.order_by('position').values_list('position', flat=True)), list(range(1, count + 1)))
                self.assertTrue(product.primary_image)
                self.assertIn(product.pk, [item['id'] for item in self.client.get('/api/products/media/').data])
                sent = self.client.post(f'/api/products/{product.pk}/media/', {'action': 'send', 'images': [image_file()]}, format='multipart')
                self.assertEqual(sent.status_code, 200, sent.data)

    def test_product_upload_rejects_zero_and_five_images(self):
        for count in [0, 5]:
            with self.subTest(count=count):
                before = Product.objects.count()
                response = self.client.post('/api/products/', {'images': [image_file() for _ in range(count)]}, format='multipart')
                self.assertEqual(response.status_code, 400)
                self.assertIn('images', response.data)
                self.assertEqual(Product.objects.count(), before)
