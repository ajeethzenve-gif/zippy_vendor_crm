import test from "node:test";
import assert from "node:assert/strict";
import { buildVendorLoginMessage } from "./vendorLoginLink.js";

test("vendor message contains the current portal and actual saved initial credentials", () => {
  const message = buildVendorLoginMessage("Edwin", { username: "edwin@zv", initial_password: "edwin@zv3210" });
  assert.ok(message.includes("https://zenvepartners.com/"));
  assert.ok(message.includes("Username: edwin@zv"));
  assert.ok(message.includes("Password: edwin@zv3210"));
  assert.ok(!message.includes("vendorname@"));
  assert.ok(!message.includes("zvcrm.zenvevet.com"));
});

test("changed passwords use an honest current-password/OTP instruction", () => {
  const message = buildVendorLoginMessage("Edwin", { username: "registered-custom-name", initial_password: null });
  assert.ok(message.includes("Username: registered-custom-name"));
  assert.ok(message.includes("use your current password"));
  assert.ok(message.includes("mobile OTP login"));
  assert.ok(!message.includes("Initial password:"));
  assert.ok(!message.includes("last six digits"));
});
