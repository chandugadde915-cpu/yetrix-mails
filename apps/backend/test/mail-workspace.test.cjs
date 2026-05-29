const assert = require("node:assert/strict");
const test = require("node:test");
const {
  MailWorkspaceService,
  SEND_UNAVAILABLE_MESSAGE,
  SMTP_UNAVAILABLE_MESSAGE,
} = require("../dist/modules/mail-workspace/mail-workspace.service.js");

function createService() {
  const config = {
    get(_key, fallback) {
      return fallback;
    },
  };
  const database = {
    enabled: false,
    query: async () => ({ rows: [] }),
  };

  return new MailWorkspaceService(config, database);
}

function exceptionMessage(error) {
  const response = typeof error.getResponse === "function" ? error.getResponse() : null;
  if (typeof response === "string") return response;
  if (response && typeof response === "object" && "message" in response) return response.message;
  return error.message;
}

test("mailbox connection test validates IMAP only", async () => {
  const service = createService();
  let imapCalls = 0;
  let smtpCalls = 0;

  service.withImap = async (_input, task) => {
    imapCalls += 1;
    return task({ noop: async () => undefined });
  };
  service.smtpTransport = () => {
    smtpCalls += 1;
    throw new Error("SMTP should not be checked during mailbox login");
  };

  const result = await service.testConnection({
    email: "user@example.com",
    password: "correct-password",
  });

  assert.equal(imapCalls, 1);
  assert.equal(smtpCalls, 0);
  assert.deepEqual(result, {
    imap: true,
    canRead: true,
    warnings: [],
  });
});

test("smtp health reports connected and disconnected without config details", async () => {
  const service = createService();

  service.smtpHealthTransport = () => ({
    verify: async () => undefined,
  });
  assert.deepEqual(await service.smtpHealth(), {
    success: true,
    smtp: "connected",
  });

  service.smtpHealthTransport = () => ({
    verify: async () => {
      throw new Error("ECONNREFUSED 127.0.0.1:587");
    },
  });
  assert.deepEqual(await service.smtpHealth(), {
    success: false,
    smtp: "disconnected",
    error: SMTP_UNAVAILABLE_MESSAGE,
  });
});

test("wrong IMAP credentials keep the exact mailbox auth error", () => {
  const service = createService();
  const error = service.mailServerException(
    new Error("Authentication failed"),
    "connect to IMAP",
  );

  assert.equal(error.getStatus(), 401);
  assert.equal(exceptionMessage(error), "Mailbox email or password is incorrect");
});

test("send mail SMTP failures return user-facing send unavailable message", async () => {
  const service = createService();

  service.smtpTransport = () => ({
    sendMail: async () => {
      throw new Error("ECONNREFUSED 127.0.0.1:587");
    },
  });
  service.storeAttachments = async () => [];

  await assert.rejects(
    () =>
      service.sendMessage({
        from: "user@example.com",
        password: "correct-password",
        to: "customer@example.com",
        subject: "Hello",
        text: "Test",
      }),
    (error) => {
      assert.equal(error.getStatus(), 502);
      assert.equal(exceptionMessage(error), SEND_UNAVAILABLE_MESSAGE);
      return true;
    },
  );
});
