# Backend

See the root README for configuration, migration and test commands.

The vendor API includes:

- `POST /api/vendors/register/`: public account and vendor registration.
- `POST /api/login/`: email/username and password authentication, returning JWT credentials.
- `GET/POST /api/vendors/`: vendor CRM records.
- `GET/PATCH /api/vendors/<id>/`: vendor profile and CRM updates.
- `GET /api/vendors/<id>/portal-dashboard/`: vendor products, order-item totals, settlements, notifications and credits.
- `POST /api/vendors/<id>/portal-dashboard/mark-read/`: persist notification read time.
- `GET/POST /api/vendors/<id>/account-details/`: authenticated owner/staff bank details with validation.
- `GET /api/credits/vendor/<id>/`: online vendor credit balance and statements.
- `GET /api/credits/vendor-plans/`: active vendor plans.

Products, orders, returns, settlements, analytics, command centre and media retain their existing URL prefixes.

`legacy_designers` holds historical migration states so both fresh installs and existing databases can migrate. It does not restore the deleted designer business app. Apply all migrations before starting the server.

`scripts/backup_mysql.py` saves a sensitive local SQL snapshot under `.work/backups`. Keep it private. Restore only into an empty database, and protect the backup as carefully as the original database.
