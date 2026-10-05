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
# Vendor mobile login with ApiTxt

The integration in `accounts/services/sms_service.py` follows ApiTxt's published `/api/sendOTP` example: JSON fields `authkey`, `mobile` (country code without +), `otp`, `channel=sms`, and an `Authorization: Bearer` API key header.

Configure these backend variables in `.env` and restart Django:

```dotenv
SMS_PROVIDER=APITXT
SMS_API_URL=https://apitxt.com/api/sendOTP
SMS_API_KEY=your_bearer_api_key
SMS_AUTH_KEY=your_auth_key
```

If your ApiTxt account provides only one key, configure `SMS_API_KEY` and omit `SMS_AUTH_KEY`; the backend uses the API key for both the Bearer header and the authkey field. If ApiTxt provides a separate authkey, configure `SMS_AUTH_KEY` to override that fallback. ApiTxt must accept the credential in both fields for single-key delivery to work. `SMS_SENDER_ID` and `SMS_ROUTE` belong to the general SMS route; the published sendOTP API uses `channel` instead.

Mobile OTP login checks that the normalized number uniquely belongs to an active Vendor account before generating a six-digit code. Only the code's hash is cached, for five minutes. After the correct OTP is entered, Django issues a session for that vendor. Unknown numbers, inactive accounts and duplicate normalized numbers cannot log in. Resends have a 60-second cooldown and invalidate the previous challenge; successful verification consumes it. Each challenge permits five attempts.

Tests mock SMS delivery. Live sending requires valid ApiTxt credentials, enabled OTP SMS and sufficient account credit. Use a shared Django cache, such as Redis, for challenge state and throttling in multi-worker deployments.
