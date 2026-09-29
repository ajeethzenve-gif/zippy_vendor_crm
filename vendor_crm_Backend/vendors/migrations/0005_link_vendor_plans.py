from django.db import migrations


def link_plans(apps, schema_editor):
    alias = schema_editor.connection.alias
    Vendor = apps.get_model("vendors", "Vendor")
    Plan = apps.get_model("credits", "OnlineVendorCredit")
    for plan in Plan.objects.using(alias).all():
        Vendor.objects.using(alias).filter(
            plan_type__isnull=True, online_membership_plan__iexact=plan.code,
        ).update(plan_type_id=plan.pk)


class Migration(migrations.Migration):
    dependencies = [
        ("vendors", "0004_vendor_plan_type"),
        ("credits", "0005_seed_online_vendor_plans"),
    ]
    operations = [migrations.RunPython(link_plans, migrations.RunPython.noop)]
