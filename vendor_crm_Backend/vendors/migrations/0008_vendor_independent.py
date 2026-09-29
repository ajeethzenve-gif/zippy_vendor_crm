from django.db import migrations, models
import django.db.models.deletion
import django.core.validators


def copy_accounts(apps, schema_editor):
    alias = schema_editor.connection.alias
    Vendor = apps.get_model("vendors", "Vendor")
    Account = apps.get_model("vendors", "VendorAccountDetails")
    Legacy = apps.get_model("designers", "DesignerAccountDetails")
    for old in Legacy.objects.using(alias).all().iterator():
        vendor = Vendor.objects.using(alias).get(legacy_designer_id=old.designer_id)
        Account.objects.using(alias).get_or_create(vendor_id=vendor.pk, defaults={
            name: getattr(old, name) for name in ["account_holder_name", "account_number", "ifsc_code", "pan_number", "is_verified"]
        })


class Migration(migrations.Migration):
    dependencies = [("vendors", "0007_copy_vendor_images")]
    operations = [
        migrations.AlterField(model_name="vendor", name="crm_record", field=models.BigIntegerField(null=True, blank=True, unique=True, db_column="crm_record_id", editable=False)),
        migrations.RenameField(model_name="vendor", old_name="crm_record", new_name="legacy_designer_id"),
        migrations.AddField(model_name="vendor", name="notifications_read_at", field=models.DateTimeField(null=True, blank=True)),
        migrations.CreateModel(name="VendorAccountDetails", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("vendor", models.OneToOneField(to="vendors.vendor", on_delete=django.db.models.deletion.CASCADE, related_name="account_details")),
            ("account_holder_name", models.CharField(max_length=255)),
            ("account_number", models.CharField(max_length=18, validators=[django.core.validators.RegexValidator(r"^[0-9]{9,18}$", "Enter 9 to 18 digits.")])),
            ("ifsc_code", models.CharField(max_length=11, validators=[django.core.validators.RegexValidator(r"^[A-Z]{4}0[A-Z0-9]{6}$", "Enter a valid IFSC code.")])),
            ("pan_number", models.CharField(max_length=10, validators=[django.core.validators.RegexValidator(r"^[A-Z]{5}[0-9]{4}[A-Z]$", "Enter a valid PAN.")])),
            ("is_verified", models.BooleanField(default=False)),
            ("created_at", models.DateTimeField(auto_now_add=True)),
            ("updated_at", models.DateTimeField(auto_now=True)),
        ]),
        migrations.RunPython(copy_accounts, migrations.RunPython.noop),
    ]
