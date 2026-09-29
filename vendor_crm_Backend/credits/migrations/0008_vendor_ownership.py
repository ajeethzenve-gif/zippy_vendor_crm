"""Copy ownership through the legacy-to-vendor mapping before replacing old FKs."""
from django.db import migrations, models
import django.db.models.deletion


def copy_owners(apps, schema_editor):
    alias = schema_editor.connection.alias
    Vendor = apps.get_model("vendors", "Vendor")
    mapping = dict(Vendor.objects.using(alias).exclude(legacy_designer_id=None).values_list("legacy_designer_id", "pk"))
    for name in ["designercreditwallet","designercreditstatement"]:
        Model = apps.get_model("credits", name)
        for record in Model.objects.using(alias).all().iterator():
            if record.designer_id not in mapping:
                raise RuntimeError(f"Missing vendor mapping for legacy record {record.designer_id}; no ownership can be discarded.")
            Model.objects.using(alias).filter(pk=record.pk).update(vendor_owner_id=mapping[record.designer_id])


class Migration(migrations.Migration):
    dependencies = [("credits", "0007_alter_designercreditwallet_offline_credits_and_more"), ("vendors", "0008_vendor_independent")]
    operations = [
        migrations.AddField(model_name="designercreditwallet", name="vendor_owner", field=models.OneToOneField(to="vendors.vendor", on_delete=django.db.models.deletion.CASCADE, null=True, related_name="+")),
        migrations.AddField(model_name="designercreditstatement", name="vendor_owner", field=models.ForeignKey(to="vendors.vendor", on_delete=django.db.models.deletion.CASCADE, null=True, related_name="+")),
        migrations.RunPython(copy_owners),
        migrations.RemoveField(model_name="designercreditwallet", name="designer"),
        migrations.RenameField(model_name="designercreditwallet", old_name="vendor_owner", new_name="designer"),
        migrations.AlterField(model_name="designercreditwallet", name="designer", field=models.OneToOneField(to="vendors.vendor", on_delete=django.db.models.deletion.CASCADE, related_name="credit_wallet")),
        migrations.RemoveField(model_name="designercreditstatement", name="designer"),
        migrations.RenameField(model_name="designercreditstatement", old_name="vendor_owner", new_name="designer"),
        migrations.AlterField(model_name="designercreditstatement", name="designer", field=models.ForeignKey(to="vendors.vendor", on_delete=django.db.models.deletion.CASCADE, related_name="credit_statements")),
    ]
