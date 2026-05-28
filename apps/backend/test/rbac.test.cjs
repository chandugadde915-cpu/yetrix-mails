const assert = require("node:assert/strict");
const test = require("node:test");
const { requireRole } = require("../dist/common/rbac.js");

test("requireRole allows permitted roles", () => {
  assert.doesNotThrow(() => requireRole({ user: { role: "owner" } }, ["owner", "admin"]));
  assert.doesNotThrow(() => requireRole({ user: { role: "admin" } }, ["owner", "admin"]));
});

test("requireRole rejects missing and unpermitted roles", () => {
  assert.throws(() => requireRole({}, ["owner"]), /permission/);
  assert.throws(() => requireRole({ user: { role: "viewer" } }, ["owner", "admin"]), /permission/);
});
