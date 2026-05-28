const assert = require("node:assert/strict");
const test = require("node:test");
const { isSuperAdmin, requireRole } = require("../dist/common/rbac.js");

test("requireRole allows permitted roles", () => {
  assert.doesNotThrow(() => requireRole({ user: { role: "superadmin" } }, ["superadmin", "owner", "admin"]));
  assert.doesNotThrow(() => requireRole({ user: { role: "owner" } }, ["owner", "admin"]));
  assert.doesNotThrow(() => requireRole({ user: { role: "admin" } }, ["owner", "admin"]));
});

test("requireRole rejects missing and unpermitted roles", () => {
  assert.throws(() => requireRole({}, ["owner"]), /permission/);
  assert.throws(() => requireRole({ user: { role: "viewer" } }, ["owner", "admin"]), /permission/);
});

test("isSuperAdmin detects global operator role", () => {
  assert.equal(isSuperAdmin({ user: { role: "superadmin" } }), true);
  assert.equal(isSuperAdmin({ user: { role: "admin" } }), false);
});
