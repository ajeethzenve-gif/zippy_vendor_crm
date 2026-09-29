"""Leave historical tables intact for recovery; remove their Django model state."""
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ("designers", "0007_designer_credit_points"),
        ("products", "0013_vendor_ownership"),
        ("orders", "0006_vendor_ownership"),
        ("credits", "0008_vendor_ownership"),
    ]
    operations = [migrations.SeparateDatabaseAndState(database_operations=[], state_operations=[
        migrations.DeleteModel(name="DesignerAccountDetails"),
        migrations.DeleteModel(name="Designer"),
    ])]
