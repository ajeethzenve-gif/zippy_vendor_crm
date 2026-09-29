from django.conf import settings
from django.db import models
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from uuid import uuid4

def vendor_code():
    return "VND-" + uuid4().hex[:20].upper()



class Vendor(models.Model):
    class Stage(models.TextChoices):
        SIGNED = "SIGNED", "Signed"
        LIVE = "LIVE", "Live"
        ACTIVE = "ACTIVE", "Active"

    class KYCStatus(models.TextChoices):
        VERIFIED = "VERIFIED", "Verified"
        PENDING = "PENDING", "Pending"
        REJECTED = "REJECTED", "Rejected"

    @property
    def designer_name(self):
        return self.vendor_name

    @property
    def designer_code(self):
        return self.vendor_code

    @property
    def owner_name(self):
        return self.vendor_name

    @property
    def is_active(self):
        return self.stage in {"SIGNED", "LIVE", "ACTIVE"}

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="vendor", null=True, blank=True)
    legacy_designer_id = models.BigIntegerField(null=True, blank=True, unique=True, db_column="crm_record_id", editable=False)
    vendor_code = models.CharField(max_length=30, default=vendor_code, unique=True)
    vendor_name = models.CharField(max_length=255, default="")
    brand_name = models.CharField(max_length=255, default="")
    city = models.CharField(max_length=100, blank=True)
    primary_category = models.CharField(max_length=150, blank=True)
    lead_source = models.CharField(max_length=30, default="Referral", choices=[(v, v) for v in ["Referral", "Outreach", "Inbound", "Instagram", "Trade Show", "Agency"]])
    sales_owner = models.CharField(max_length=150, default="Unassigned", choices=[(v, v) for v in ["Nisha Kapoor", "Dev Ranganathan", "Sana Qureshi", "Unassigned"]])
    next_followup_date = models.DateField(null=True, blank=True)
    tier = models.CharField(max_length=20, default="EMERGING", choices=[("PREMIUM", "Premium"), ("CORE", "Core"), ("EMERGING", "Emerging")])
    plan_type = models.ForeignKey("credits.OnlineVendorCredit", on_delete=models.PROTECT, null=True, blank=True, related_name="vendors")
    online_membership_plan = models.CharField(max_length=20, blank=True, null=True, choices=[(v, v.title()) for v in ["SILVER", "GOLD", "PLATINUM", "PALLADIUM"]])
    credit_points = models.PositiveBigIntegerField(default=0)
    take_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    acquisition_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    renewal_likelihood = models.PositiveSmallIntegerField(default=0, validators=[MaxValueValidator(100)])
    contract_end_date = models.DateField(null=True, blank=True)
    stage = models.CharField(max_length=20, default="LEAD", choices=[(v, v.title()) for v in ["LEAD", "QUALIFIED", "PORTFOLIO", "REVIEW", "APPROVED", "CONTRACT", "SIGNED", "LIVE", "ACTIVE", "REJECTED", "INACTIVE"]])
    kyc_status = models.CharField(max_length=20, default="PENDING", choices=[(v, v.title()) for v in ["PENDING", "VERIFIED", "REJECTED"]])
    lost_reason = models.CharField(max_length=255, blank=True)
    contract_signed = models.BooleanField(default=False)
    follow_up_tasks = models.JSONField(default=list, blank=True)
    email = models.EmailField(blank=True, null=True, unique=True)
    phone = models.CharField(max_length=16, unique=True, blank=True, null=True, validators=[RegexValidator(r"^\+?[0-9]{10,15}$", "Enter 10–15 digits, optionally starting with +.")])
    legal_business_name = models.CharField(max_length=255, blank=True)
    business_type = models.CharField(max_length=30, blank=True, choices=[("SOLE_PROPRIETOR", "Sole proprietor"), ("PARTNERSHIP", "Partnership"), ("LLP", "Limited liability partnership"), ("COMPANY", "Company"), ("OTHER", "Other")])
    alternate_phone = models.CharField(max_length=16, blank=True, validators=[RegexValidator(r"^\+?[0-9]{10,15}$", "Enter 10–15 digits, optionally starting with +.")])
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default="India")
    postal_code = models.CharField(max_length=12, blank=True, validators=[RegexValidator(r"^[A-Za-z0-9][A-Za-z0-9 -]{1,11}$", "Enter a valid postal code.")])
    gst_number = models.CharField(max_length=15, blank=True, validators=[RegexValidator(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$", "Enter a valid 15-character GSTIN format.")])
    website = models.URLField(max_length=200, blank=True)
    instagram_url = models.URLField(max_length=200, blank=True)
    business_description = models.TextField(max_length=2000, blank=True)
    logo = models.ImageField(upload_to="vendors/logos/", blank=True, null=True)
    profile_image = models.ImageField(upload_to="vendors/profiles/", blank=True, null=True)
    notifications_read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.brand_name


class VendorAccountDetails(models.Model):
    vendor = models.OneToOneField(Vendor, on_delete=models.CASCADE, related_name="account_details")
    account_holder_name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=18, validators=[RegexValidator(r"^[0-9]{9,18}$", "Enter 9 to 18 digits.")])
    ifsc_code = models.CharField(max_length=11, validators=[RegexValidator(r"^[A-Z]{4}0[A-Z0-9]{6}$", "Enter a valid IFSC code.")])
    pan_number = models.CharField(max_length=10, validators=[RegexValidator(r"^[A-Z]{5}[0-9]{4}[A-Z]$", "Enter a valid PAN.")])
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
