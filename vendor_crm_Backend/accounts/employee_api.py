"""Admin-only creation of an employee, login credentials and role in one transaction."""
from uuid import uuid4
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers, permissions, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Employee, Role, UserRole

EMPLOYEE_ROLES = ("Admin", "Merchandiser", "Catalogue QA", "Operations", "Finance", "Media")


class CanManageEmployees(permissions.BasePermission):
    message = "Only CRM administrators can manage employees."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        role = getattr(getattr(user, "user_role", None), "role", None)
        return user.is_superuser or (role.name == "Admin" if role else user.is_staff)


class EmployeeSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", max_length=150, validators=get_user_model()._meta.get_field("username").validators)
    first_name = serializers.CharField(source="user.first_name", max_length=150)
    last_name = serializers.CharField(source="user.last_name", max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(source="user.email")
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)
    role = serializers.ChoiceField(source="designation", choices=EMPLOYEE_ROLES)
    user_id = serializers.IntegerField(read_only=True)
    employee_id = serializers.CharField(read_only=True)
    phone_number = serializers.CharField(max_length=15, validators=[RegexValidator(r"^\+?[0-9]{10,14}$", "Enter 10 to 14 digits, optionally starting with +.")])

    class Meta:
        model = Employee
        fields = ["id", "employee_id", "user_id", "username", "password", "first_name", "last_name", "email", "phone_number", "role", "joining_date", "gender", "date_of_birth", "address", "city", "state", "country", "postal_code", "is_active", "created_at"]
        read_only_fields = ["id", "is_active", "created_at"]

    def validate_username(self, value):
        if get_user_model().objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already in use.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if get_user_model().objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value

    def validate_phone_number(self, value):
        if Employee.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("This phone number belongs to another employee.")
        return value

    def validate_date_of_birth(self, value):
        if value and value >= timezone.localdate():
            raise serializers.ValidationError("Date of birth must be in the past.")
        return value

    def validate(self, attrs):
        user = get_user_model()(**attrs["user"])
        try:
            validate_password(attrs["password"], user=user)
        except ValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

    def create(self, validated_data):
        credentials = validated_data.pop("user")
        password = validated_data.pop("password")
        try:
            with transaction.atomic():
                user = get_user_model().objects.create_user(**credentials, password=password)
                role, _ = Role.objects.get_or_create(name=validated_data["designation"])
                UserRole.objects.create(user=user, role=role)
                return Employee.objects.create(user=user, employee_id="EMP-" + uuid4().hex[:16].upper(), **validated_data)
        except IntegrityError:
            raise serializers.ValidationError({"detail": "An employee with these account details already exists."})


class EmployeeListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, CanManageEmployees]
    serializer_class = EmployeeSerializer
    queryset = Employee.objects.select_related("user", "user__user_role__role").order_by("-created_at")


class EmployeeRolesView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanManageEmployees]

    def get(self, request):
        return Response([{"name": name} for name in EMPLOYEE_ROLES])
