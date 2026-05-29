const assert = require("node:assert/strict");
const test = require("node:test");
const { DatabaseService } = require("../dist/modules/database/database.service.js");
const { AuthService } = require("../dist/modules/auth/auth.service.js");
const { StatusController } = require("../dist/modules/status/status.controller.js");
const { hashPassword } = require("../dist/common/password.js");

function config(values = {}) {
  return {
    get(key, fallback) {
      return values[key] ?? fallback;
    },
  };
}

test("MongoDB app store stays disabled without MONGODB_URI", async () => {
  const service = new DatabaseService(config());
  await service.onModuleInit();
  assert.equal(service.connected, false);
});

test("mailbox credentials encrypt and decrypt without storing plain text", () => {
  const service = new DatabaseService(config({
    MAILBOX_CREDENTIAL_ENCRYPTION_KEY: "test_32_byte_key_for_mailbox_secret",
  }));
  const encrypted = service.encryptMailboxCredential("Mailbox@123");

  assert.equal(encrypted.algorithm, "aes-256-gcm");
  assert.notEqual(encrypted.ciphertext, "Mailbox@123");
  assert.equal(service.decryptMailboxCredential(encrypted), "Mailbox@123");
});

test("admin login validates a MongoDB user password hash", async () => {
  const user = {
    id: "user-1",
    workspace_id: "workspace-1",
    username: "admin",
    email: "admin@yetrixtechnologies.com",
    name: "Admin",
    password_hash: hashPassword("Correct@123"),
    role: "superadmin",
    status: "active",
  };
  const database = {
    enabled: true,
    findUserByLogin: async () => user,
    updateUser: async () => user,
    recordDomain: async () => undefined,
  };
  const auth = new AuthService(config({
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD: "Correct@123",
    AUTH_SECRET: "test_secret",
    MAIL_DOMAIN: "yetrixtechnologies.com",
  }), database);

  const session = await auth.login("admin", "Correct@123");
  assert.equal(session.user.email, user.email);
  assert.equal(session.user.role, "superadmin");
});

test("DNS verification records are stored in the dns_records collection", async () => {
  const writes = [];
  const service = new DatabaseService(config({ MONGODB_URI: "mongodb://example/yetrix_mail" }));
  service.collection = (name) => ({
    insertOne: async (doc) => writes.push({ name, doc }),
  });

  await service.saveDnsRecord({
    workspaceId: "workspace-1",
    domainId: "domain-1",
    domain: "example.com",
    status: "verified",
    checks: { mx: true },
    records: [{ type: "MX", value: "mail.example.com" }],
    raw: {},
  });

  assert.equal(writes[0].name, "dns_records");
  assert.equal(writes[0].doc.domain, "example.com");
  assert.equal(writes[0].doc.status, "verified");
});

test("status output exposes safe Mongo and SMTP fields only", async () => {
  const controller = new StatusController(
    { connected: true },
    { connectionStatus: async () => ({ connected: true }) },
    {
      smtpHealth: async () => ({ success: true, smtp: "connected" }),
      smtpConfigSummary: () => ({
        hostConfigured: true,
        portConfigured: true,
        mode: "mailcow-relay",
        secure: false,
        requireTLS: true,
      }),
    },
  );

  const status = await controller.status();
  assert.equal(status.mongodb.connected, true);
  assert.equal(status.smtp.config.mode, "mailcow-relay");
  assert.equal("password" in status.smtp.config, false);
});
