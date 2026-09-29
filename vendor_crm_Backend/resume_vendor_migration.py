"""Resume an interrupted additive MySQL migration after verifying existing columns."""
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "zenvefashion.settings")
import django
django.setup()
from django.db import connection, transaction
from django.db.migrations.loader import MigrationLoader
from django.db.migrations.recorder import MigrationRecorder
from django.db.migrations.operations.fields import AddField
from django.db.migrations.operations.special import RunPython
loader = MigrationLoader(connection)
key = ("vendors", "0003_vendor_acquisition_cost_vendor_brand_name_and_more")
if key in loader.applied_migrations:
    print("Already applied")
else:
    migration = loader.get_migration(*key)
    state = loader.project_state([key], at_end=False)
    for operation in migration.operations:
        old_state = state.clone()
        operation.state_forwards("vendors", state)
        skip = False
        if isinstance(operation, AddField):
            model = state.apps.get_model("vendors", operation.model_name)
            with connection.cursor() as cursor:
                columns = {field.name for field in connection.introspection.get_table_description(cursor, model._meta.db_table)}
            skip = model._meta.get_field(operation.name).column in columns
        if not skip:
            with connection.schema_editor() as editor:
                if isinstance(operation, RunPython):
                    with transaction.atomic():
                        operation.database_forwards("vendors", editor, old_state, state)
                else:
                    operation.database_forwards("vendors", editor, old_state, state)
    MigrationRecorder(connection).record_applied(*key)
    print("Vendor migration completed and recorded.")
