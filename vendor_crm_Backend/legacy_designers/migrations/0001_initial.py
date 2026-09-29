"""Recovered historical schema. Runtime CRM records live in vendors.Vendor.
The final legacy table shape is retained for fresh installs and existing migration history.
"""
from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [migrations.CreateModel(name="Designer", fields=[
        ('id', models.BigAutoField(primary_key=True, serialize=False)),
        ('designer_code', models.CharField(max_length=30, blank=True, unique=True)),
        ('designer_name', models.CharField(max_length=255, blank=True)),
        ('brand_name', models.CharField(max_length=255, blank=True)),
        ('owner_name', models.CharField(max_length=255, blank=True)),
        ('email', models.CharField(max_length=254, blank=True)),
        ('phone', models.CharField(max_length=20, null=True, blank=True)),
        ('city', models.CharField(max_length=100, blank=True)),
        ('state', models.CharField(max_length=100, null=True, blank=True)),
        ('country', models.CharField(max_length=100, blank=True)),
        ('primary_category', models.CharField(max_length=150, blank=True)),
        ('tier', models.CharField(max_length=30, blank=True)),
        ('gst_number', models.CharField(max_length=15, null=True, blank=True)),
        ('kyc_status', models.CharField(max_length=20, blank=True)),
        ('stage', models.CharField(max_length=30, blank=True)),
        ('logo', models.CharField(max_length=100, null=True, blank=True)),
        ('profile_image', models.CharField(max_length=100, null=True, blank=True)),
        ('website', models.CharField(max_length=200, null=True, blank=True)),
        ('instagram_url', models.CharField(max_length=200, null=True, blank=True)),
        ('facebook_url', models.CharField(max_length=200, null=True, blank=True)),
        ('lead_source', models.CharField(max_length=100, blank=True)),
        ('lost_reason', models.CharField(max_length=255, null=True, blank=True)),
        ('sales_owner', models.CharField(max_length=150, blank=True)),
        ('offline_membership_plan', models.CharField(max_length=20, null=True, blank=True)),
        ('online_membership_plan', models.CharField(max_length=20, null=True, blank=True)),
        ('take_rate', models.DecimalField(max_digits=5, decimal_places=2, default=0)),
        ('acquisition_cost', models.DecimalField(max_digits=12, decimal_places=2, default=0)),
        ('lifetime_gmv', models.DecimalField(max_digits=12, decimal_places=2, default=0)),
        ('monthly_gmv', models.DecimalField(max_digits=12, decimal_places=2, default=0)),
        ('sku_productivity', models.DecimalField(max_digits=12, decimal_places=2, default=0)),
        ('health_score', models.IntegerField(default=0)),
        ('renewal_likelihood', models.IntegerField(default=0)),
        ('credit_points', models.PositiveBigIntegerField(default=0)),
        ('follow_up_tasks', models.JSONField(default=list)),
        ('description', models.TextField(null=True, blank=True)),
        ('kyc_verified_at', models.DateTimeField(null=True, blank=True)),
        ('created_at', models.DateTimeField(auto_now_add=True)),
        ('updated_at', models.DateTimeField(auto_now=True)),
        ('contract_start_date', models.DateField(null=True, blank=True)),
        ('contract_end_date', models.DateField(null=True, blank=True)),
        ('next_followup_date', models.DateField(null=True, blank=True)),
        ('contract_signed', models.BooleanField(default=False)),
        ('is_active', models.BooleanField(default=False))
    ], options={"db_table": "designer"})]
