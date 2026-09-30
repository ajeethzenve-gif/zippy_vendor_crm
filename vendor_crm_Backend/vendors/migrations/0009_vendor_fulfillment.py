from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("vendors", "0008_vendor_independent")]

    operations = [
        migrations.AddField(
            model_name="vendor",
            name="fulfillment",
            field=models.CharField(
                max_length=10,
                blank=True,
                default="",
                choices=[("HUBSHIP", "Hubship"), ("DROPSHIP", "Dropship"), ("BOTH", "Both")],
            ),
        ),
    ]
