"""Copy ownership through the legacy-to-vendor mapping before replacing old FKs."""
from django.db import migrations, models
import django.db.models.deletion


def copy_owners(apps, schema_editor):
    alias = schema_editor.connection.alias
    Vendor = apps.get_model("vendors", "Vendor")
    mapping = dict(Vendor.objects.using(alias).exclude(legacy_designer_id=None).values_list("legacy_designer_id", "pk"))
    for name in ["product"]:
        Model = apps.get_model("products", name)
        for record in Model.objects.using(alias).all().iterator():
            if record.designer_id not in mapping:
                raise RuntimeError(f"Missing vendor mapping for legacy record {record.designer_id}; no ownership can be discarded.")
            Model.objects.using(alias).filter(pk=record.pk).update(vendor_owner_id=mapping[record.designer_id])


class Migration(migrations.Migration):
    dependencies = [("products", "0012_alter_product_fulfilment_location_and_more"), ("vendors", "0008_vendor_independent")]
    operations = [
        migrations.AddField(model_name="product", name="vendor_owner", field=models.ForeignKey(to="vendors.vendor", on_delete=django.db.models.deletion.CASCADE, null=True, related_name="+")),
        migrations.RunPython(copy_owners),
        migrations.RemoveField(model_name="product", name="designer"),
        migrations.RenameField(model_name="product", old_name="vendor_owner", new_name="designer"),
        migrations.AlterField(model_name="product", name="designer", field=models.ForeignKey(to="vendors.vendor", on_delete=django.db.models.deletion.CASCADE, related_name="products", verbose_name="Designer")),
    ]
