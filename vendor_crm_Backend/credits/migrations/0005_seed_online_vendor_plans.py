from django.db import migrations


def seed_plans(apps, schema_editor):
    plans = apps.get_model("credits", "OnlineVendorCredit").objects.using(schema_editor.connection.alias)
    for order, (code, points) in enumerate([
        ("SILVER", 200000), ("GOLD", 375000),
        ("PLATINUM", 500000), ("PALLADIUM", 700000),
    ]):
        plans.get_or_create(code=code, defaults={
            "name": code.title(), "credit_points": points, "sort_order": order,
        })


class Migration(migrations.Migration):
    dependencies = [("credits", "0004_onlinevendorcredit_and_more")]
    operations = [migrations.RunPython(seed_plans, migrations.RunPython.noop)]
