from django.db import migrations


def copy_images(apps, schema_editor):
    Vendor = apps.get_model("vendors", "Vendor")
    alias = schema_editor.connection.alias
    for vendor in Vendor.objects.using(alias).exclude(crm_record=None).select_related("crm_record"):
        changed = []
        for field in ["logo", "profile_image"]:
            if not getattr(vendor, field) and getattr(vendor.crm_record, field):
                setattr(vendor, field, getattr(vendor.crm_record, field).name)
                changed.append(field)
        if changed:
            vendor.save(using=alias, update_fields=changed)


class Migration(migrations.Migration):
    dependencies = [("vendors", "0006_vendor_logo_vendor_profile_image")]
    operations = [migrations.RunPython(copy_images, migrations.RunPython.noop)]
