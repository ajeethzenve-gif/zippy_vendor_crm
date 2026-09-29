# Vendor frontend

React 18 and Vite. Run `npm ci`, then `npm run dev`. Production verification: `npm run build`.

Set `VITE_API_BASE_URL` to your Django API URL, without a trailing slash. Defaults to `http://127.0.0.1:8000/api`.

Main routes: `/register`, `/login`, `/vendor-crm`, `/vendor-portal`, `/catalogue`, `/catalogueqa`, `/inventory`, `/storefront`, `/orders`, `/delivery`, `/returns`, `/settlement`, `/analytics`, `/command-centre`, `/media`.

Login checks credentials with Django. A vendor receives vendor-layer access; staff users receive administrator access. API access tokens are stored in sessionStorage. Profile data and bank details use vendor IDs. Historical service function and JSON field names remain for compatibility.

Pages load on demand through React.lazy. Role-based routes are a user-interface feature; the backend must enforce all authorization before production deployment. See the root README for current API access limitations.
