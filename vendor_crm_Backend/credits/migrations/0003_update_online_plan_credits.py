from django.db import migrations


def update_online_plan_credits(apps, schema_editor):
    OnlineFashionCredit = apps.get_model("credits", "OnlineFashionCredit")
    plans = OnlineFashionCredit.objects.using(schema_editor.connection.alias)
    for plan, points in [("SILVER", 200000), ("GOLD", 375000), ("PLATINUM", 500000)]:
        existing = plans.filter(plan__iexact=plan)
        if existing.exists():
            existing.update(credit_points=points)
        else:
            plans.create(plan=plan, credit_points=points)


class Migration(migrations.Migration):
    dependencies = [("credits", "0002_alter_offlinefashioncredit_plan_and_more")]
    operations = [migrations.RunPython(update_online_plan_credits, migrations.RunPython.noop)]
