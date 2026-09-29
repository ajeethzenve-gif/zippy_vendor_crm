# Zippy Vendor CRM

React/Vite frontend and Django REST backend for vendor registration, CRM, product catalogue, inventory, orders, returns, settlements, analytics and media review.

## Run locally (PowerShell)

From this folder, start the backend:

```powershell
.\.venv\Scripts\python.exe -m pip install -r vendor_crm_Backend\requirements.txt
cd vendor_crm_Backend
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py runserver 8000
```

In a second terminal:

```powershell
cd vendor_crm_frontend
npm ci
npm run dev
```

Open http://localhost:5173. Register at `/register`, then sign in with the registered email and password. For staff access, create a Django superuser using `python manage.py createsuperuser`. The role preview on the login page does not grant access.

The backend reads `vendor_crm_Backend/.env`. MySQL is the default. Set `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` and `DB_PORT` for your database. For an isolated SQLite setup, set `$env:DB_ENGINE='sqlite'` before running migrations. Frontend API location is configurable with `VITE_API_BASE_URL` (default `http://127.0.0.1:8000/api`).

## Vendor conversion

- `/vendor-crm` and `/vendor-portal` are the primary frontend routes. Old designer bookmarks redirect.
- Runtime records are owned by `vendors.Vendor`: products, settlements, credit wallets/statements and bank accounts.
- `legacy_designers` contains migration history only, with no runtime model or API. It is required because existing migrations and databases refer to the deleted app label. Do not delete it.
- Historical `designer` and `designer_account_details` tables remain as recovery archives. Current code does not write to them.
- Existing product/settlement JSON keys such as `designer` remain compatibility names; their values now refer to **vendor IDs**. Do not send old designer IDs.
- Ownership migrations copy through `legacy_designer_id`, even when the old ID differs from the vendor ID. Bank details are copied to `vendors_vendoraccountdetails`. These ownership migrations are forward-only; restore a backup for rollback.

Apply the entire migration graph with `manage.py migrate`, not just one app.

## Verification

```powershell
cd vendor_crm_Backend
$env:DB_ENGINE='sqlite'
..\.venv\Scripts\python.exe manage.py test vendors products orders credits accounts
..\.venv\Scripts\python.exe scripts/check_vendor_upgrade.py
..\.venv\Scripts\python.exe manage.py check
..\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

Run `npm run build` from `vendor_crm_frontend` to verify the frontend.

## Access limitations

Credential login uses Django JWT authentication. Bank-account reads and writes require the vendor's authenticated account or a staff user. Logout clears the session token; sign in again when it expires.

Several inherited operational APIs still use `AllowAny` (catalogue, CRM, orders, analytics and media). Frontend route permissions do not secure those APIs. This remains a local development CRM, and needs server-side role/ownership enforcement across those endpoints before public deployment. Analytics also retains estimated conversion and franchise-allocation logic; those are not audited business measurements.

See `CODE_REVIEW.md` for changes, verification and remaining limitations.

## Employee accounts

Sign in as a CRM administrator and open `/employees` (also linked beside the user menu). Enter employee details, select Admin, Merchandiser, Catalogue QA, Operations, Finance or Media, and choose a username/password.

Creation is atomic across `auth_user`, `accounts_employee`, `accounts_role` and `accounts_userrole`. Employee IDs are generated automatically. Passwords use Django hashing and are never returned by the API or listed in the directory. Username, email and employee phone duplicates are rejected. Employees can log in using username or email and receive their assigned role's workspace access.

The employee endpoints (`GET/POST /api/employees/` and `GET /api/employee-roles/`) require an authenticated CRM administrator. A CRM Admin role does not grant Django `is_staff` or `is_superuser` privileges. A Django superuser can bootstrap employee administration; ordinary staff with an assigned non-admin role cannot create employees.
