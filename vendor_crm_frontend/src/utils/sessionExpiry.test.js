import test from "node:test";
import assert from "node:assert/strict";
import { tokenExpiresAt, loginPathForRole } from "./sessionExpiry.js";

const token = payload => `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;

test("reads JWT expiry as an absolute timestamp", () => {
  assert.equal(tokenExpiresAt(token({ exp: 1800000000 })), 1800000000000);
  assert.equal(tokenExpiresAt(token({ exp: 1 })), 1000);
});

test("missing or invalid expiry cannot leave a session open", () => {
  for (const value of [null, "", "invalid", "header.bad.signature", token({}), token({ exp: "1800000000" }), token({ exp: -1 })]) {
    assert.equal(tokenExpiresAt(value), 0);
  }
});

test("vendor timeout returns to vendor login and staff to CRM login", () => {
  assert.equal(loginPathForRole("designer"), "/vendor-login");
  for (const role of ["admin", "merchandiser", "qa", "inventory", "finance", "media"]) {
    assert.equal(loginPathForRole(role), "/login");
  }
});
