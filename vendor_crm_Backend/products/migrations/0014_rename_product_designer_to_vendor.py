from django.db import migrations, models
import django.db.models.deletion


def remove_existing_designer_index(apps, schema_editor):
    """0013 may already drop this index when it replaces the designer FK."""
    Product = apps.get_model("products", "Product")
    with schema_editor.connection.cursor() as cursor:
        constraints = schema_editor.connection.introspection.get_constraints(
            cursor, Product._meta.db_table
        )
    if "product_designe_7335c5_idx" in constraints:
        schema_editor.remove_index(
            Product, models.Index(fields=["designer"], name="product_designe_7335c5_idx")
        )


def restore_designer_index(apps, schema_editor):
    Product = apps.get_model("products", "Product")
    with schema_editor.connection.cursor() as cursor:
        constraints = schema_editor.connection.introspection.get_constraints(
            cursor, Product._meta.db_table
        )
    if "product_designe_7335c5_idx" not in constraints:
        schema_editor.add_index(
            Product, models.Index(fields=["designer"], name="product_designe_7335c5_idx")
        )


class Migration(migrations.Migration):
    dependencies = [("products", "0013_vendor_ownership")]
    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[migrations.RunPython(
                remove_existing_designer_index, restore_designer_index
            )],
            state_operations=[migrations.RemoveIndex(
                model_name="product", name="product_designe_7335c5_idx"
            )],
        ),
        migrations.RenameField(model_name="product", old_name="designer", new_name="vendor"),
        migrations.AlterField(model_name="product", name="vendor", field=models.ForeignKey(
            to="vendors.vendor", on_delete=django.db.models.deletion.CASCADE,
            related_name="products", verbose_name="Vendor")),
        migrations.AddIndex(model_name="product", index=models.Index(fields=["vendor"], name="product_vendor_idx")),
    ]
