import test from "node:test";
import assert from "node:assert/strict";
import { homeForRole, portalTitle } from "./portalRoutes.js";
import { getVendorLoginUrl } from "./vendorLoginLink.js";

test("vendors enter the root portal and staff enter CRM", () => {
  assert.equal(homeForRole("designer"), "/");
  for (const role of ["admin", "merchandiser", "qa", "inventory", "finance", "media"]) {
    assert.equal(homeForRole(role), "/crm");
  }
  assert.equal(getVendorLoginUrl(), "https://zenvepartners.com/");
});

test("entry page titles identify the chosen audience even with another audience signed in", () => {
  for (const role of [undefined, "admin", "designer"]) {
    assert.equal(portalTitle("/", role), "Zenve Vendor");
    assert.equal(portalTitle("/vendor-login", role), "Zenve Vendor");
    assert.equal(portalTitle("/crm", role), "Zenve Vendor CRM");
    assert.equal(portalTitle("/login", role), "Zenve Vendor CRM");
  }
});

test("shared workspaces retain the authenticated audience title", () => {
  for (const path of ["/catalogue", "/vendor-portal", "/vendor-dashboard"]) {
    assert.equal(portalTitle(path, "designer"), "Zenve Vendor");
    assert.equal(portalTitle(path, "admin"), "Zenve Vendor CRM");
  }
  assert.equal(portalTitle("/vendor-kyc-submit"), "Zenve Vendor");
});
