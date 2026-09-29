from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [("designers", "0003_designer_sku_productivity")]
    operations = [migrations.CreateModel(name="DesignerAccountDetails", fields=[
        ("id", models.BigAutoField(primary_key=True, serialize=False)),
        ("designer", models.OneToOneField(to="designers.designer", on_delete=django.db.models.deletion.CASCADE)),
        ("account_holder_name", models.CharField(max_length=255)),
        ("account_number", models.CharField(max_length=18)),
        ("ifsc_code", models.CharField(max_length=11)),
        ("pan_number", models.CharField(max_length=10)),
        ("is_verified", models.BooleanField(default=False)),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("updated_at", models.DateTimeField(auto_now=True)),
    ], options={"db_table": "designer_account_details"})]
