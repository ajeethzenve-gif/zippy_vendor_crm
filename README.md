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

Open http://localhost:5173. Staff sign in at `/login`; vendors sign in at `/vendor-login` with their registered username or email and password. Vendor registration is at `/register`. For staff access, create a Django superuser using `python manage.py createsuperuser`.

## Vendor login links

Share `/vendor-login` on the public frontend domain. Successful vendor sign-in opens `/vendor-portal`. Staff accounts use `/login`, and each login checks its account type before creating a session. Vendor logout and signed-out portal visits return to `/vendor-login`.

The Vendor CRM contact card has **Share Login on WhatsApp** (opens a draft for the team to review and send) and **Copy vendor login link** for email or other services. Links contain no credentials or vendor identifiers.

The link uses the current frontend origin by default. If the team uses a different internal address, set `VITE_PUBLIC_APP_URL` to the public frontend origin before building. Localhost links only work on the current computer. The public host must serve the frontend for direct visits to `/vendor-login`; its API URL must also be reachable by vendors.

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


### Social Media and Vendor KYC layers

Layer 14 (`/social-media`) stores vendor-linked campaign posts, captions, creative links, planned publication times and live post URLs. Access: Admin, Merchandiser and Media. Scheduling is a planning record; it does not send posts to external platforms.

Layer 15 (`/vendor-kyc`) stores GSTIN/PAN identifiers and tracks separate provider results. Access: Admin, Merchandiser and Finance. PAN verification completes KYC when no GSTIN is supplied; when a GSTIN is supplied, both results must be `VERIFIED`. Changing a GSTIN invalidates prior KYC results. Approval creates the linked vendor login account independently of KYC. APPROVED and LIVE vendors can sign in using OTP even when KYC is pending or rejected; successful login sets the stage to LIVE.

Apply the new tables with `python manage.py migrate` from the backend directory. ApiTxt is the default verification provider. Configure `APITXT_KYC_AUTH_KEY` in the backend environment, restart the backend, and apply migrations before using verification. Requests use POST JSON over HTTPS with redirects disabled. Until credentials are configured, verification returns an explicit unavailable response and never marks identifiers verified. No live provider calls are made by the automated tests.

Provider adapter boundary: set `VENDOR_KYC_ADAPTER` to the dotted path of the provider-specific callable after implementing it against the provider documentation. It accepts keyword arguments `gst_number`, `pan_number`, `pan_name` and `pan_dob` (a Python date), and returns a dictionary with `gst_status`, `pan_status` (each `VERIFIED`, `PENDING` or `REJECTED`) and a nonempty provider `reference`. Keep provider credentials in backend environment variables; never return credentials or raw provider payloads to the browser.


ApiTxt documentation: [PAN verification](https://apitxt.com/developer/pan-verify-api) and [PAN-to-GSTIN lookup](https://apitxt.com/developer/pan-gstin-verify-api). The KYC form collects the PAN holder name and date of birth required by `panVerify`; the backend sends DOB in `DD/MM/YYYY` format. PAN must be valid, with positive name and DOB match flags. When GSTIN is supplied, `panGstinVerify` must return it under that PAN with `ACTIVE` status. Cancelled/suspended or unmatched supplied GSTINs cannot complete KYC. With no GSTIN supplied, the GST lookup is skipped. Infrastructure/authentication/balance errors never count as identity rejections or successful verification. Provider request references are saved; provider keys and raw identity responses are not returned to the frontend. Each provider call may consume credits; the Social Media and KYC layers do not make provider calls automatically.


KYC detail collection: staff can use **Send KYC notification** in Layer 15 to create an in-app request for a vendor with an active linked login. The vendor sees a notification and portal banner linking to `/vendor-kyc-details`, where they submit PAN number, PAN holder name and DOB (GSTIN is optional). The linked vendor can access this form. The request also emails a signed, submission-only link to `/vendor-kyc-submit`; this link does not require login, expires after 48 hours, and is invalidated after submission or replacement. Its token is kept in the URL fragment and sent to the API in the Authorization header, not in the query string. The link cannot read saved PAN or bank details. Staff can reissue expired requests. Submission does not run paid provider calls or approve KYC. Staff see submitted details and then use **Verify with provider**. Without GSTIN, a successful PAN/name/DOB verification completes KYC; with GSTIN, both checks must succeed. Apply migration `0012_vendor_kyc_requests` before deploying this flow.

### Vendor email notifications

Portal entry points on `https://zenvepartners.com`: `/` shows **Zenve Vendor** login and, after vendor authentication, the vendor dashboard. `/crm` shows **Zenve Vendor CRM** staff login and, after staff authentication, the role's workspace. Browser titles, branding, logout and session-expiry redirects follow the audience. `/vendor-login` redirects to `/`; `/login` redirects to `/crm` for existing bookmarks. The frontend host must serve `index.html` for SPA routes such as `/crm` and `/vendor-kyc-submit`. Deploy the updated frontend build and restart the backend after environment changes. Set `VENDOR_PORTAL_URL=https://zenvepartners.com` for new email links.

Vendor creation sends a welcome email explaining that approval is pending. Approval sends the vendor login link, username, newly generated initial password, and SMS OTP login instructions. Existing usable passwords are preserved and are never recovered or re-emailed. Normal record saves do not repeat these emails. Order creation sends one message per owning vendor with only that vendor's catalogue products, quantities, unit amounts and item totals; customer contact/shipping data and other vendors' products/totals are excluded. Unknown product ownership is skipped. Emails run after database commit so rolled-back changes send nothing. Delivery failures are logged without credentials or identity tokens and do not undo the business change; there is no automatic email retry queue.

Configure SMTP and the public portal destination using `vendor_crm_Backend/notifications.env.example`. Set `VENDOR_PORTAL_URL` to the approved HTTPS portal origin and `VENDOR_FROM_EMAIL` to a vendor sender authorized by the SMTP provider (it falls back to `DEFAULT_FROM_EMAIL` when unset). Login/PAN-link emails are disabled when the portal destination is unset. Set `EMAIL_USE_TLS=true` for STARTTLS (normally port 587), or `EMAIL_USE_SSL=true` and `EMAIL_USE_TLS=false` for implicit TLS (normally port 465). Company GSTIN is **29AACCZ7283R1Z5** in the company registry and notification footer; this does not overwrite individual vendors' tax identifiers. Use the Django console or in-memory email backend for local testing. No live email is sent by the notification test suite.
