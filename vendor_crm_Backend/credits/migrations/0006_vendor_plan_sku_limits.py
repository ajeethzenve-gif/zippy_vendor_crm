from django.db import migrations, models


def correct_plans(apps, schema_editor):
    plans = apps.get_model("credits", "OnlineVendorCredit").objects.using(schema_editor.connection.alias)
    for order, (code, points, skus) in enumerate([
        ("SILVER", 200000, 24),
        ("GOLD", 375000, 49),
        ("PLATINUM", 500000, 65),
    ]):
        plans.update_or_create(code=code, defaults={
            "name": code.title(), "credit_points": points,
            "sku_limit": skus, "is_active": True, "sort_order": order,
        })
    # Retain the row for any historical vendor assignments.
    plans.filter(code="PALLADIUM").update(is_active=False)


class Migration(migrations.Migration):
    dependencies = [("credits", "0005_seed_online_vendor_plans")]
    operations = [
        migrations.AddField(
            model_name="onlinevendorcredit", name="sku_limit",
            field=models.PositiveIntegerField(null=True, blank=True),
        ),
        migrations.RunPython(correct_plans, migrations.RunPython.noop),
    ]
