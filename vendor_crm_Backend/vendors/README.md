# Vendor storage

All active records live on `vendors.Vendor`. CRM-created vendors may have no login account; public registration creates a user with a hashed password and the Vendor role. Plan assignment derives credit points from the active database plan. Removing a plan resets its allocation.

Profile images are stored in `media/vendors/`. Account details live in `VendorAccountDetails`; their API requires an authenticated owner or staff user. A changed bank account loses its verification status.

`legacy_designer_id` is a read-only historical mapping, not a live relation. It preserves correct ownership when migrating products, settlements and credit records. Historical aliases in API responses exist only for compatibility with the frontend.

See the root README for verification and the limitations of the inherited operational API permissions.
