# Code review and repair summary

## Fixed

1. **Django startup:** products, settlements, credit wallets, credit statements and analytics imported or referenced the deleted designer app. Runtime ownership now resolves to Vendor.
2. **Migration graph:** old migrations depended on deleted files. A migration-only historical package reconstructs the known schema and migration names. New migrations preserve relationships through explicit old-to-new ID mappings. Old tables remain intact.
3. **Frontend/API mismatch:** designer URLs had no backend route. Calls now use vendor APIs. Primary pages and styles are named VendorCrm/VendorPortal, with redirects for old bookmarks.
4. **Portal backend:** added dashboard totals, vendor-owned products/orders/settlements, online credits, notification read state and bank-detail persistence.
5. **Profile saves:** the portal submitted a read-only legacy name field. It now sends vendor_name. Images save to the vendor's own upload directory.
6. **Orders:** order items use string product IDs, not a Django product relation. Portal filtering and sold-unit totals now use the actual schema.
7. **Settlements:** removed the fallback that assigned an unknown product's payout to the first vendor. A zero commission rate remains zero.
8. **Login:** the credential form now authenticates through Django. JWT is sent by the shared API service; logout clears it. New sessions no longer default to administrator. Banking APIs require the authenticated owner or staff.
9. **Build:** pages load on demand. The former 909 KB JavaScript entry is split into a roughly 187 KB entry and page chunks, without the prior chunk-size warning. Removed a stray filename token that broke the portal's root CSS selector.
10. **Setup:** corrected directory names and documentation, simplified dependencies to the installed runtime packages, added isolated SQLite mode and a private MySQL snapshot helper.

## Verification performed

- 23 backend tests passed: registration validation/rollback, plan assignment, real credential login, profile uploads, bank ownership/validation, portal records, operational endpoints, media review, zero commission and unlinked-product settlement behavior.
- Migration regression passed with crossed IDs: old IDs 41/42 map to vendor IDs 42/41 without transferring ownership to the wrong vendor.
- Full migration graph passed on a fresh SQLite database.
- MySQL migration applied successfully after saving a private SQL snapshot under `.work/backups`.
- Existing local records: 1 vendor, 1 credit wallet, 0 products, 0 settlements. Existing uploads were retained.
- Vendor list, products, orders, returns, settlements, analytics, command centre and the existing vendor portal returned HTTP 200 after migration.
- Django system checks passed; no missing model migrations detected.
- Vite production build passed. Login and vendor registration screens rendered in the local browser.

## Remaining scope and limits

- Inherited operational APIs still allow anonymous access. Public deployment requires server-side permissions and vendor ownership checks across those APIs; frontend role restrictions alone are insufficient.
- Some analytics use estimated views or heuristic franchise assignment. They should not be treated as audited metrics.
- Credit creation still inherits the old add-on charging flow, including broad exception handling. Payment-grade accounting needs transactional charging, explicit insufficient-balance handling and concurrency tests.
- No external payment, email/OTP, Google OAuth or Figma service was exercised. These require configured credentials and service-specific integration tests.
- No claim is made that every frontend interaction or responsive layout has been browser-tested.
- The deleted app's original source was unavailable. Recovered historical migrations support the observed local schema and a fresh install. Other databases stopped partway through the old designer migrations need separate migration-history review.
- Ownership migrations are forward-only. Use the saved SQL snapshot for rollback into an empty database.

## Employee account creation

Added an admin-only employee directory and creation form at `/employees`, with role options from `/api/employee-roles/`. Creation writes a hashed-password `auth_user`, an Employee and a UserRole in one transaction. Login accepts username or email; an assigned employee role takes precedence over the generic staff flag. This feature does not alter the inherited permissions of the other operational APIs documented above.

Verification: 29 backend tests passed, including six employee-account tests covering account/role linkage, username and email login, hashed passwords, duplicate validation, transaction rollback and administrator permissions. Vite build, Django system checks and migration consistency checks passed. The employee role migration was applied locally.

## Shared interface refresh

All routes now use WorkspaceShell and a scoped visual system in Workspace.css. Operational pages share sidebar navigation, indigo actions, white panels, slate typography, consistent form controls, table spacing and colored metric accents. The overview has four colored KPI cards and workspace links. Sidebar links respect existing role clearance. Employee-add and vendor-registration navigation buttons remain removed.

Desktop sidebar becomes a collapsible menu below 1000 px. Dashboard layout was inspected at desktop and 390 px mobile width. Protected layer layouts use the shared styles but were not individually browser-verified in an authenticated session. Production build passed. No backend/data changes were made for this visual refresh.
