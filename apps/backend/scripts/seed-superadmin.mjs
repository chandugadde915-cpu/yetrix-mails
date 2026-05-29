import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { createRequire } from "node:module";
import { MongoClient } from "mongodb";

const require = createRequire(import.meta.url);
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "yetrix_mail";
const username = process.env.ADMIN_USERNAME || "admin";
const password = process.env.ADMIN_PASSWORD;
const mailDomain = process.env.MAIL_DOMAIN || "yetrixtechnologies.com";
const workspaceName = process.env.BOOTSTRAP_WORKSPACE_NAME || "Yetrix Mails";

if (!uri || !password) {
  throw new Error("MONGODB_URI and ADMIN_PASSWORD are required");
}

const now = new Date().toISOString();
const email = username.includes("@") ? username.toLowerCase() : `${username.toLowerCase()}@${mailDomain}`;
const client = new MongoClient(uri);

await client.connect();
const db = client.db(dbName);
const users = db.collection("users");
const workspaces = db.collection("workspaces");
const domains = db.collection("domains");

let user = await users.findOne({ $or: [{ email }, { username: username.toLowerCase() }] });
let workspaceId = user?.workspace_id;

if (!workspaceId) {
  workspaceId = cryptoRandomId();
  await workspaces.insertOne({
    id: workspaceId,
    name: workspaceName,
    status: "active",
    created_at: now,
    updated_at: now,
  });
}

if (user) {
  await users.updateOne(
    { id: user.id },
    {
      $set: {
        password_hash: hashPassword(password),
        role: "superadmin",
        status: "active",
        updated_at: now,
      },
    },
  );
} else {
  await users.insertOne({
    id: cryptoRandomId(),
    workspace_id: workspaceId,
    username: username.toLowerCase(),
    email,
    name: "Admin",
    password_hash: hashPassword(password),
    role: "superadmin",
    status: "active",
    created_at: now,
    updated_at: now,
  });
}

await domains.updateOne(
  { domain: mailDomain.toLowerCase() },
  {
    $setOnInsert: {
      id: cryptoRandomId(),
      workspace_id: workspaceId,
      domain: mailDomain.toLowerCase(),
      status: "pending",
      created_at: now,
    },
    $set: { updated_at: now },
  },
  { upsert: true },
);

await client.close();
console.log(`Seeded superadmin ${email}`);

function hashPassword(value) {
  const bcrypt = tryRequire("bcryptjs");
  if (bcrypt) return bcrypt.hashSync(value, 12);
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(value, salt, 64).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

function cryptoRandomId() {
  return randomUUID();
}

function tryRequire(name) {
  try {
    return (awaitlessRequire())(name);
  } catch {
    return null;
  }
}

function awaitlessRequire() {
  return require;
}
