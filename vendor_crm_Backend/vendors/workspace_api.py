import re
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Vendor, VendorVerification, SocialMediaPost, VendorKYCRequest
from .kyc_provider import verify_identifiers, VerificationUnavailable


class WorkspacePermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        role = getattr(getattr(user, "user_role", None), "role", None)
        return bool(user.is_superuser or (role and role.name in view.allowed_roles) or (user.is_staff and role is None))


class SocialPostSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source="vendor.vendor_name", read_only=True)
    brand_name = serializers.CharField(source="vendor.brand_name", read_only=True)

    class Meta:
        model = SocialMediaPost
        fields = "__all__"
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def validate(self, attrs):
        status = attrs.get("status", getattr(self.instance, "status", "DRAFT"))
        if status == "SCHEDULED" and not attrs.get("scheduled_at", getattr(self.instance, "scheduled_at", None)):
            raise serializers.ValidationError({"scheduled_at": "Choose a date and time before scheduling."})
        if status == "PUBLISHED" and not attrs.get("published_url", getattr(self.instance, "published_url", "")):
            raise serializers.ValidationError({"published_url": "Add the live post URL before marking it published."})
        return attrs


class SocialPostList(generics.ListCreateAPIView):
    permission_classes = [WorkspacePermission]
    allowed_roles = {"Admin", "Media", "Merchandiser"}
    serializer_class = SocialPostSerializer

    def get_queryset(self):
        queryset = SocialMediaPost.objects.select_related("vendor")
        for field in ["vendor", "status", "platform"]:
            value = self.request.query_params.get(field)
            if value:
                if field == "vendor" and not value.isdigit():
                    raise serializers.ValidationError({"vendor": "Enter a valid vendor ID."})
                queryset = queryset.filter(**{field: value})
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class SocialPostDetail(generics.RetrieveUpdateAPIView):
    permission_classes = [WorkspacePermission]
    allowed_roles = SocialPostList.allowed_roles
    serializer_class = SocialPostSerializer
    queryset = SocialMediaPost.objects.select_related("vendor")
    http_method_names = ["get", "patch", "head", "options"]


class WorkspaceVendors(APIView):
    permission_classes = [WorkspacePermission]
    allowed_roles = {"Admin", "Media", "Merchandiser", "Finance"}

    def get(self, request):
        return Response(list(Vendor.objects.order_by("brand_name").values("id", "vendor_name", "brand_name")))


class VerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorVerification
        fields = ["gst_number", "pan_number", "pan_name", "pan_dob", "gst_status", "pan_status", "provider_reference", "checked_at"]
        read_only_fields = ["gst_status", "pan_status", "provider_reference", "checked_at"]

    def validate(self, attrs):
        unsupported = set(self.initial_data) - {"gst_number", "pan_number", "pan_name", "pan_dob"}
        if unsupported:
            raise serializers.ValidationError("Only GSTIN and PAN identity details can be submitted; verification results come from the provider.")
        gst = attrs.get("gst_number", getattr(self.instance, "gst_number", "")).strip().upper()
        pan = attrs.get("pan_number", getattr(self.instance, "pan_number", "")).strip().upper()
        if not re.fullmatch(r"[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]", gst):
            raise serializers.ValidationError({"gst_number": "Enter a valid 15-character GSTIN."})
        if not re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", pan):
            raise serializers.ValidationError({"pan_number": "Enter a valid PAN."})
        if gst[2:12] != pan:
            raise serializers.ValidationError({"pan_number": "PAN must match the PAN embedded in this GSTIN."})
        if attrs.get("pan_dob") and attrs["pan_dob"] > timezone.localdate():
            raise serializers.ValidationError({"pan_dob": "Date of birth cannot be in the future."})
        return {"gst_number": gst, "pan_number": pan, "pan_name": attrs.get("pan_name", getattr(self.instance, "pan_name", "")).strip(), "pan_dob": attrs.get("pan_dob", getattr(self.instance, "pan_dob", None))}


def kyc_row(vendor):
    record = getattr(vendor, "verification", None)
    return {"id": vendor.pk, "vendor_name": vendor.vendor_name, "brand_name": vendor.brand_name,
            "stage": vendor.stage, "kyc_status": vendor.kyc_status,
            "verification": VerificationSerializer(record).data if record else None,
            "gst_number": vendor.gst_number, "kyc_request": kyc_request_data(vendor)}


class VendorKYCList(APIView):
    permission_classes = [WorkspacePermission]
    allowed_roles = {"Admin", "Merchandiser", "Finance"}

    def get(self, request):
        vendors = Vendor.objects.select_related("verification", "kyc_request").order_by("brand_name")
        return Response([kyc_row(vendor) for vendor in vendors])


class VendorKYCDetail(APIView):
    permission_classes = [WorkspacePermission]
    allowed_roles = VendorKYCList.allowed_roles

    @transaction.atomic
    def patch(self, request, pk):
        vendor = get_object_or_404(Vendor.objects.select_for_update(), pk=pk)
        record = VendorVerification.objects.filter(vendor=vendor).first()
        serializer = VerificationSerializer(record, data=request.data)
        serializer.is_valid(raise_exception=True)
        if not record or any(getattr(record, key) != value for key, value in serializer.validated_data.items()):
            serializer.save(vendor=vendor, gst_status="PENDING", pan_status="PENDING", provider_reference="", checked_at=None, checked_by=None)
            vendor.gst_number = serializer.validated_data["gst_number"]
            vendor.kyc_status = "PENDING"
            vendor.save(update_fields=["gst_number", "kyc_status"])
        return Response(kyc_row(vendor))

    def post(self, request, pk):
        vendor = get_object_or_404(Vendor, pk=pk)
        record = get_object_or_404(VendorVerification, vendor=vendor)
        gst, pan, name, dob = record.gst_number, record.pan_number, record.pan_name, record.pan_dob
        if not gst or not name or not dob:
            return Response({"detail": "Save the GSTIN, PAN holder name and date of birth before verifying."}, status=400)
        try:
            result = verify_identifiers(gst, pan, pan_name=name, pan_dob=dob)
        except VerificationUnavailable as error:
            return Response({"detail": str(error)}, status=503)
        try:
            with transaction.atomic():
                vendor = Vendor.objects.select_for_update().get(pk=pk)
                record = VendorVerification.objects.select_for_update().get(vendor=vendor)
                if (record.gst_number, record.pan_number, record.pan_name, record.pan_dob) != (gst, pan, name, dob) or vendor.gst_number != gst:
                    return Response({"detail": "Vendor details changed during verification. Save and verify the latest details."}, status=409)
                record.gst_status = result["gst_status"]
                record.pan_status = result["pan_status"]
                record.provider_reference = str(result["reference"])[:255]
                record.checked_by = request.user
                record.checked_at = timezone.now()
                record.save()
                statuses = {record.gst_status, record.pan_status}
                vendor.kyc_status = "VERIFIED" if statuses == {"VERIFIED"} else "REJECTED" if "REJECTED" in statuses else "PENDING"
                vendor.save(update_fields=["kyc_status"])
        except DjangoValidationError as error:
            return Response({"detail": error.messages}, status=400)
        return Response(kyc_row(vendor))


def kyc_request_data(vendor):
    request = getattr(vendor, "kyc_request", None)
    return {"status": request.status, "requested_at": request.requested_at, "submitted_at": request.submitted_at} if request else None


class VendorKYCRequestView(APIView):
    permission_classes = [WorkspacePermission]
    allowed_roles = VendorKYCList.allowed_roles

    @transaction.atomic
    def post(self, request, pk):
        vendor = get_object_or_404(Vendor.objects.select_for_update().select_related("user"), pk=pk)
        if not vendor.user_id or not vendor.user.is_active:
            return Response({"detail": "This vendor needs an active linked login account before a KYC notification can be sent."}, status=400)
        row = VendorKYCRequest.objects.filter(vendor=vendor).first()
        if not row or row.status != "REQUESTED":
            row, _ = VendorKYCRequest.objects.update_or_create(vendor=vendor, defaults={
                "status": "REQUESTED", "requested_by": request.user, "requested_at": timezone.now(), "submitted_at": None})
        return Response(kyc_row(vendor))


class VendorPANSubmissionSerializer(serializers.Serializer):
    pan_number = serializers.RegexField(r"^[A-Z]{5}[0-9]{4}[A-Z]$", max_length=10)
    pan_name = serializers.CharField(max_length=255)
    pan_dob = serializers.DateField()
    gst_number = serializers.CharField(max_length=15, required=False, allow_blank=True)

    def to_internal_value(self, data):
        data = data.copy()
        for key in ["pan_number", "gst_number"]:
            if key in data:
                data[key] = str(data[key]).strip().upper()
        return super().to_internal_value(data)

    def validate(self, attrs):
        if set(self.initial_data) - set(self.fields):
            raise serializers.ValidationError("Only your PAN details and optional GSTIN can be submitted.")
        if attrs["pan_dob"] > timezone.localdate():
            raise serializers.ValidationError({"pan_dob": "Date of birth cannot be in the future."})
        vendor = self.context["vendor"]
        gst = attrs.get("gst_number", vendor.gst_number).strip().upper()
        if gst and (not re.fullmatch(r"[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]", gst) or gst[2:12] != attrs["pan_number"]):
            raise serializers.ValidationError({"gst_number": "GSTIN must be valid and match this PAN."})
        attrs["gst_number"] = gst
        return attrs


class VendorKYCSubmissionView(APIView):
    permission_classes = [IsAuthenticated]

    def get_vendor(self, request, pk, lock=False):
        queryset = Vendor.objects.select_for_update() if lock else Vendor.objects.all()
        vendor = get_object_or_404(queryset, pk=pk)
        if vendor.user_id != request.user.pk:
            raise PermissionDenied("You can only submit KYC details for your own vendor account.")
        return vendor

    def get(self, request, pk):
        vendor = self.get_vendor(request, pk)
        if request.query_params.get("status_only"):
            return Response({"kyc_request": kyc_request_data(vendor)})
        return Response(kyc_row(vendor))

    @transaction.atomic
    def post(self, request, pk):
        vendor = self.get_vendor(request, pk, lock=True)
        row = VendorKYCRequest.objects.filter(vendor=vendor).first()
        if not row or row.status != "REQUESTED":
            return Response({"detail": "There is no open KYC details request for your account."}, status=400)
        serializer = VendorPANSubmissionSerializer(data=request.data, context={"vendor": vendor})
        serializer.is_valid(raise_exception=True)
        record = VendorVerification.objects.filter(vendor=vendor).first()
        changed = not record or any(getattr(record, key) != value for key, value in serializer.validated_data.items())
        if changed:
            VendorVerification.objects.update_or_create(vendor=vendor, defaults={**serializer.validated_data,
                "gst_status": "PENDING", "pan_status": "PENDING", "provider_reference": "", "checked_at": None, "checked_by": None})
            vendor.gst_number = serializer.validated_data["gst_number"]
            vendor.kyc_status = "PENDING"
            vendor.save(update_fields=["gst_number", "kyc_status"])
        row.status = "SUBMITTED"
        row.submitted_at = timezone.now()
        row.save(update_fields=["status", "submitted_at"])
        return Response(kyc_row(vendor))
