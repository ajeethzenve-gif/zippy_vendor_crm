from uuid import uuid4
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction, IntegrityError
from rest_framework import serializers
from accounts.models import Role, UserRole
from .models import Vendor
from credits.models import OnlineVendorCredit
from credits.serializers import OnlineVendorCreditSerializer


class VendorRegistrationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    phone = serializers.CharField(required=True, validators=Vendor._meta.get_field("phone").validators)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)
    owner_name = serializers.CharField(source="vendor_name", max_length=150, write_only=True)
    brand_name = serializers.CharField(max_length=255, write_only=True)
    city = serializers.CharField(max_length=100, write_only=True)
    primary_category = serializers.CharField(max_length=150, write_only=True)
    vendor_code = serializers.CharField(read_only=True)
    status = serializers.CharField(source="stage", read_only=True)

    gst_number = serializers.CharField(required=False, allow_blank=True, max_length=15)

    def validate_gst_number(self, value):
        value = value.strip().upper()
        for validator in Vendor._meta.get_field("gst_number").validators:
            validator(value) if value else None
        return value

    class Meta:
        model = Vendor
        fields = ["id", "email", "phone", "password", "owner_name", "brand_name", "city", "primary_category", "vendor_code", "status", "legal_business_name", "business_type", "alternate_phone", "address_line1", "address_line2", "state", "country", "postal_code", "gst_number", "website", "instagram_url", "business_description"]
        read_only_fields = ["id"]

    def validate_phone(self, value):
        if Vendor.objects.filter(phone=value).exists():
            raise serializers.ValidationError("A vendor with this phone already exists.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if get_user_model().objects.filter(email__iexact=value).exists() or Vendor.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        user = get_user_model()(email=attrs["email"], first_name=attrs["vendor_name"])
        try:
            validate_password(attrs["password"], user=user)
        except ValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

    def create(self, validated_data):
        data = validated_data.copy()
        password = data.pop("password")
        detail_fields = ("legal_business_name", "business_type", "alternate_phone", "address_line1", "address_line2", "state", "country", "postal_code", "gst_number", "website", "instagram_url", "business_description")
        details = {field: data.pop(field) for field in detail_fields if field in data}
        try:
            with transaction.atomic():
                user = get_user_model().objects.create_user(username="vendor_" + uuid4().hex, email=data["email"], password=password, first_name=data["vendor_name"])
                role, _ = Role.objects.get_or_create(name="Vendor")
                UserRole.objects.create(user=user, role=role)
                return Vendor.objects.create(user=user, **data, **details)
        except IntegrityError:
            raise serializers.ValidationError("Registration could not be completed. Email or phone may already be registered.")


class VendorSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        try:
            return super().create(validated_data)
        except ValidationError as error:
            raise serializers.ValidationError(error.message_dict if hasattr(error, "message_dict") else error.messages)

    def update(self, instance, validated_data):
        try:
            return super().update(instance, validated_data)
        except ValidationError as error:
            raise serializers.ValidationError(error.message_dict if hasattr(error, "message_dict") else error.messages)

    plan_type = serializers.PrimaryKeyRelatedField(queryset=OnlineVendorCredit.objects.filter(is_active=True), required=False, allow_null=True)
    plan_details = OnlineVendorCreditSerializer(source="plan_type", read_only=True)
    legacy_designer_id = serializers.IntegerField(read_only=True)
    # Legacy display aliases keep the existing CRM component compatible.
    designer_name = serializers.CharField(source="vendor_name", read_only=True)
    designer_code = serializers.CharField(source="vendor_code", read_only=True)
    owner_name = serializers.CharField(source="vendor_name", read_only=True)

    class Meta:
        model = Vendor
        exclude = ["user"]
        read_only_fields = ["id", "vendor_code", "created_at", "credit_points", "online_membership_plan", "notifications_read_at"]
        extra_kwargs = {"vendor_name": {"required": True, "allow_blank": False}, "brand_name": {"required": True, "allow_blank": False}}

    def validate(self, attrs):
        email = attrs.get("email", getattr(self.instance, "email", None))
        phone = attrs.get("phone", getattr(self.instance, "phone", None))
        if not email and not phone:
            raise serializers.ValidationError("Provide an email address or mobile number.")
        if "plan_type" in attrs:
            plan = attrs["plan_type"]
            attrs["online_membership_plan"] = plan.code if plan else None
            attrs["credit_points"] = plan.credit_points if plan else 0
        return attrs

    def validate_email(self, value):
        value = value.strip().lower() if value else None
        query = Vendor.objects.filter(email__iexact=value) if value else Vendor.objects.none()
        if self.instance:
            query = query.exclude(pk=self.instance.pk)
        if query.exists():
            raise serializers.ValidationError("A vendor with this email already exists.")
        return value

    def validate_phone(self, value):
        return value or None

    def validate_gst_number(self, value):
        return value.strip().upper() if value else ""


class VendorAccountSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import VendorAccountDetails
        model = VendorAccountDetails
        exclude = ["vendor"]
        read_only_fields = ["id", "is_verified", "created_at", "updated_at"]

    def to_internal_value(self, data):
        data = data.copy()
        for field in ["ifsc_code", "pan_number"]:
            if isinstance(data.get(field), str):
                data[field] = data[field].strip().upper()
        return super().to_internal_value(data)

    def update(self, instance, validated_data):
        if any(getattr(instance, key) != value for key, value in validated_data.items()):
            validated_data["is_verified"] = False
        return super().update(instance, validated_data)
