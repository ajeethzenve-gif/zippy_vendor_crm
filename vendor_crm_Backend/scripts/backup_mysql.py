"""Create a private SQL snapshot of the configured local MySQL database.
Writes schema and data to .work/backups without logging row contents.
"""
import os
import sys
from datetime import datetime
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zenvefashion.settings')
import django
django.setup()
from django.db import connection
if connection.vendor != 'mysql':
    raise SystemExit('This snapshot helper expects MySQL.')
output = Path(__file__).resolve().parents[2] / '.work' / 'backups'
output.mkdir(parents=True, exist_ok=True)
path = output / ('before-vendor-upgrade-' + datetime.now().strftime('%Y%m%d-%H%M%S') + '.sql')
quote = connection.ops.quote_name
with connection.cursor() as cursor, path.open('x', encoding='utf-8') as backup:
    cursor.execute('START TRANSACTION WITH CONSISTENT SNAPSHOT')
    backup.write('SET FOREIGN_KEY_CHECKS=0;\n')
    tables = connection.introspection.table_names(cursor)
    for table in tables:
        cursor.execute(f'SHOW CREATE TABLE {quote(table)}')
        backup.write(cursor.fetchone()[1] + ';\n')
        cursor.execute(f'SELECT * FROM {quote(table)}')
        columns = ','.join(quote(column[0]) for column in cursor.description)
        while rows := cursor.fetchmany(500):
            for row in rows:
                values = ','.join(connection.connection.literal(value) for value in row)
                backup.write(f'INSERT INTO {quote(table)} ({columns}) VALUES ({values});\n')
    backup.write('SET FOREIGN_KEY_CHECKS=1;\n')
    connection.rollback()
print(f'Created private snapshot: {path.name} ({path.stat().st_size} bytes; {len(tables)} tables)')
