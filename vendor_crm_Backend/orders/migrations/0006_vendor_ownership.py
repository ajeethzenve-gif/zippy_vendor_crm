"""Copy ownership through the legacy-to-vendor mapping before replacing old FKs."""
from django.db import migrations, models
import django.db.models.deletion


def copy_owners(apps, schema_editor):
    alias = schema_editor.connection.alias
    Vendor = apps.get_model("vendors", "Vendor")
    mapping = dict(Vendor.objects.using(alias).exclude(legacy_designer_id=None).values_list("legacy_designer_id", "pk"))
    for name in ["settlement"]:
        Model = apps.get_model("orders", name)
        for record in Model.objects.using(alias).all().iterator():
            if record.designer_id not in mapping:
                raise RuntimeError(f"Missing vendor mapping for legacy record {record.designer_id}; no ownership can be discarded.")
            Model.objects.using(alias).filter(pk=record.pk).update(vendor_owner_id=mapping[record.designer_id])


class Migration(migrations.Migration):
    dependencies = [("orders", "0005_alter_orderitem_table"), ("vendors", "0008_vendor_independent")]
    operations = [
        migrations.AddField(model_name="settlement", name="vendor_owner", field=models.ForeignKey(to="vendors.vendor", on_delete=django.db.models.deletion.CASCADE, null=True, related_name="+")),
        migrations.RunPython(copy_owners),
        migrations.RemoveField(model_name="settlement", name="designer"),
        migrations.RenameField(model_name="settlement", old_name="vendor_owner", new_name="designer"),
        migrations.AlterField(model_name="settlement", name="designer", field=models.ForeignKey(to="vendors.vendor", on_delete=django.db.models.deletion.CASCADE, related_name="settlements", verbose_name="Designer")),
    ]
