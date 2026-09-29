from urllib.parse import urlparse

from django.db import transaction
from django.db.models import Count
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Product, ProductImage, MediaJob, MediaAsset


class MediaInput(serializers.Serializer):
    action = serializers.ChoiceField(choices=["save", "send", "approve", "changes"])
    figma_url = serializers.URLField(required=False, allow_blank=True, max_length=1000)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=10000)
    feedback = serializers.CharField(required=False, allow_blank=True, max_length=10000)
    images = serializers.ListField(child=serializers.ImageField(), required=False, max_length=12)

    def validate_figma_url(self, value):
        if value and (urlparse(value).scheme != "https" or urlparse(value).hostname not in {"figma.com", "www.figma.com"}):
            raise serializers.ValidationError("Use an HTTPS figma.com link.")
        return value

    def validate_images(self, images):
        for image in images:
            if image.size > 10 * 1024 * 1024 or image.image.format not in {"JPEG", "PNG", "WEBP"}:
                raise serializers.ValidationError("Use JPG, PNG or WebP images up to 10 MB each.")
        return images


def media_data(product, request):
    job = getattr(product, "media_job", None)
    def image_url(kind, pk):
        return request.build_absolute_uri(f"/api/products/media-files/{kind}/{pk}/")
    return {
        "id": product.pk, "product_name": product.product_name, "sku": product.sku,
        "designer_id": product.designer_id, "designer_name": product.designer.designer_name,
        "brand": product.designer.brand_name,
        "originals": [{"id": i.pk, "image": image_url("original", i.pk), "position": i.position} for i in product.product_images.all()],
        "status": job.status if job else "QUEUED",
        "figma_url": job.figma_url if job else "", "notes": job.notes if job else "",
        "feedback": job.feedback if job else "", "sent_at": job.sent_at if job else None,
        "assets": [{"id": a.pk, "image": image_url("generated", a.pk)} for a in job.assets.order_by("id")] if job else [],
    }


class MediaQueueView(APIView):
    # Matches the existing CRM's demo API access model.
    permission_classes = [AllowAny]

    def get(self, request):
        products = Product.objects.annotate(image_count=Count("product_images")).filter(image_count__gte=1, image_count__lte=4).select_related("designer", "media_job").prefetch_related("product_images", "media_job__assets")
        designer = request.query_params.get("designer")
        if designer:
            if not designer.isdigit():
                return Response({"detail": "Invalid designer ID."}, status=400)
            products = products.filter(designer_id=designer, media_job__sent_at__isnull=False)
        return Response([media_data(p, request) for p in products])


class MediaDetailView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, pk):
        product = get_object_or_404(Product.objects.select_for_update(), pk=pk)
        data = MediaInput(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        action = values["action"]
        if not 1 <= product.product_images.count() <= 4:
            return Response({"detail": "Between 1 and 4 original product images are required."}, status=400)
        job, _ = MediaJob.objects.get_or_create(product=product)
        if action in {"approve", "changes"}:
            if job.status != "IN_REVIEW":
                return Response({"detail": "Only images awaiting designer review can be reviewed."}, status=400)
            if action == "changes" and not values.get("feedback", "").strip():
                return Response({"detail": "Describe the changes needed."}, status=400)
            job.feedback = values.get("feedback", "")
            job.status = "APPROVED" if action == "approve" else "CHANGES_REQUESTED"
        else:
            if job.status in {"IN_REVIEW", "APPROVED"}:
                return Response({"detail": "This delivery is locked while in review or approved."}, status=400)
            images = values.get("images", [])
            if action == "send" and not images and not job.assets.exists():
                return Response({"detail": "Upload generated images before sending."}, status=400)
            if images:
                job.assets.all().delete()
                for image in images:
                    MediaAsset.objects.create(job=job, image=image)
            for field in ["figma_url", "notes"]:
                if field in values:
                    setattr(job, field, values[field])
            if action == "send":
                job.status = "IN_REVIEW"
                job.sent_at = timezone.now()
        job.save()
        return Response(media_data(Product.objects.get(pk=pk), request))


class MediaFileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, kind, pk):
        model = {"original": ProductImage, "generated": MediaAsset}.get(kind)
        if model is None:
            raise Http404
        asset = get_object_or_404(model, pk=pk)
        try:
            response = FileResponse(asset.image.open("rb"))
            response["X-Content-Type-Options"] = "nosniff"
            return response
        except FileNotFoundError:
            raise Http404
