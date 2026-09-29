from django.db import models


# =========================================================
# COMMON PLAN CHOICES
# =========================================================

class FashionPlan(models.TextChoices):
    SILVER = "SILVER", "Silver"
    GOLD = "GOLD", "Gold"
    PLATINUM = "PLATINUM", "Platinum"
    PALLADIUM = "PALLADIUM", "Palladium"
    PALLADIUM_PLUS = "PALLADIUM++", "Palladium++"


# =========================================================
# ONLINE FASHION CREDIT
# =========================================================

class OnlineFashionCredit(models.Model):

    plan = models.CharField(
        max_length=20,
        choices=FashionPlan.choices,
        unique=True,
        db_index=True,
    )

    # Number of catalogues included
    catalogue = models.PositiveIntegerField(
        default=0,
    )

    # Number of products included
    products = models.PositiveIntegerField(
        default=0,
    )

    # Credit points given with this plan
    credit_points = models.PositiveBigIntegerField(
        default=0,
    )

    # Points charged for each catalogue
    catalogue_charge_points = models.PositiveIntegerField(
        default=0,
    )

    # Minimum validity / plan days
    min_days = models.PositiveIntegerField(
        default=0,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "online_fashion_credit"
        ordering = ["id"]
        verbose_name = "Online Fashion Credit"
        verbose_name_plural = "Online Fashion Credits"

    def __str__(self):
        return (
            f"{self.get_plan_display()} - "
            f"{self.credit_points} points"
        )


# =========================================================
# OFFLINE FASHION CREDIT
# =========================================================

class OfflineFashionCredit(models.Model):

    plan = models.CharField(
        max_length=20,
        choices=FashionPlan.choices,
        unique=True,
        db_index=True,
    )

    # Current membership price
    membership_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    # Old/original price shown with strike-through
    original_membership_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    # Credit points given for offline plan
    credit_points = models.PositiveBigIntegerField(
        default=0,
    )

    # Included catalogue count
    included_catalogue = models.PositiveIntegerField(
        default=0,
    )

    # Included catalogue per showroom
    per_showroom = models.PositiveIntegerField(
        default=0,
    )

    # Extra catalogue allowance
    extra_catalogue = models.PositiveIntegerField(
        default=0,
    )

    # Extra catalogue / showroom
    extra_per_showroom = models.PositiveIntegerField(
        default=0,
    )

    # Minimum days
    min_days = models.PositiveIntegerField(
        default=0,
    )

    # Average SKU
    average_sku = models.PositiveIntegerField(
        default=0,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "offline_fashion_credit"
        ordering = ["id"]
        verbose_name = "Offline Fashion Credit"
        verbose_name_plural = "Offline Fashion Credits"

    def __str__(self):
        return (
            f"{self.get_plan_display()} - "
            f"{self.credit_points} points"
        )

    @property
    def savings_amount(self):

        if (
            self.original_membership_price
            >
            self.membership_price
        ):
            return (
                self.original_membership_price
                -
                self.membership_price
            )

        return 0


# =========================================================
# DESIGNER CREDIT WALLET
# =========================================================

class DesignerCreditWallet(models.Model):
    designer = models.OneToOneField(
        "vendors.Vendor",
        on_delete=models.CASCADE,
        related_name="credit_wallet",
    )

    online_credits = models.PositiveBigIntegerField(
        default=0,
        verbose_name="Online Credits (Free)",
    )

    offline_credits = models.PositiveBigIntegerField(
        default=0,
        verbose_name="Offline Credits (Paid)",
    )

    points_used = models.PositiveBigIntegerField(
        default=0,
        verbose_name="Points Used",
    )

    online_plan = models.CharField(
        max_length=50,
        default="",
        blank=True,
        verbose_name="Online Plan",
    )

    offline_plan = models.CharField(
        max_length=50,
        default="",
        blank=True,
        verbose_name="Offline Plan",
    )

    offline_pack_expiry = models.DateField(
        null=True,
        blank=True,
        verbose_name="Offline Pack Expiry",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "designer_credit_wallet"
        verbose_name = "Designer Credit Wallet"
        verbose_name_plural = "Designer Credit Wallets"

    def __str__(self):
        return f"{self.designer.brand_name} Wallet - Total {self.total_balance} pts"

    @property
    def total_balance(self):
        return self.online_credits


# =========================================================
# DESIGNER CREDIT STATEMENT / TRANSACTIONS
# =========================================================

class DesignerCreditStatement(models.Model):
    wallet = models.ForeignKey(
        DesignerCreditWallet,
        on_delete=models.CASCADE,
        related_name="statements",
        null=True,
        blank=True,
    )

    designer = models.ForeignKey(
        "vendors.Vendor",
        on_delete=models.CASCADE,
        related_name="credit_statements",
    )

    description = models.CharField(
        max_length=255,
        verbose_name="Description",
    )

    channel = models.CharField(
        max_length=20,
        choices=[("ONLINE", "ONLINE"), ("OFFLINE", "OFFLINE")],
        default="ONLINE",
        verbose_name="Channel",
    )

    points = models.IntegerField(
        verbose_name="Points Change",
    )

    date_str = models.CharField(
        max_length=30,
        blank=True,
        null=True,
        verbose_name="Display Date",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        db_table = "designer_credit_statement"
        ordering = ["-id"]
        verbose_name = "Designer Credit Statement"
        verbose_name_plural = "Designer Credit Statements"

    def __str__(self):
        return f"{self.designer.brand_name} - {self.description} ({self.points} pts)"
class OnlineVendorCredit(models.Model):
    """Online credit plans available for vendor onboarding."""
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=100)
    credit_points = models.PositiveBigIntegerField()
    sku_limit = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "online_vendor_credit"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.name} — {self.credit_points:,} points"
