import { MongoClient } from "mongodb";

const postgresUrl = process.env.DATABASE_URL;
const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "yetrix_mail";

if (!postgresUrl || !mongoUri) {
  throw new Error("DATABASE_URL and MONGODB_URI are required for one-time migration");
}

let pg;
try {
  pg = await import("pg");
} catch {
  throw new Error("Install pg temporarily before running migration: npm install pg");
}

const { Pool } = pg.default ?? pg;
const pool = new Pool({ connectionString: postgresUrl });
const mongo = new MongoClient(mongoUri);

await mongo.connect();
const db = mongo.db(dbName);

await copyTable("workspaces", "workspaces");
await copyTable("users", "users");
await copyTable("domains", "domains");
await copyTable("mailboxes", "mailboxes");
await copyTable("aliases", "aliases");
await copyTable("dns_checks", "dns_records");
await copyTable("audit_events", "audit_logs");
await copyTable("sent_attachments", "attachments");

await pool.end();
await mongo.close();
console.log("PostgreSQL to MongoDB migration completed");

async function copyTable(table, collectionName) {
  const exists = await pool.query("SELECT to_regclass($1) AS table_name", [table]);
  if (!exists.rows[0]?.table_name) {
    console.log(`Skipped missing table ${table}`);
    return;
  }

  const result = await pool.query(`SELECT * FROM ${table}`);
  if (result.rows.length === 0) {
    console.log(`Skipped empty table ${table}`);
    return;
  }

  const docs = result.rows.map((row) => normalizeRow(row));
  await db.collection(collectionName).insertMany(docs, { ordered: false }).catch((error) => {
    if (error?.code !== 11000) throw error;
  });
  console.log(`Migrated ${docs.length} rows from ${table} to ${collectionName}`);
}

function normalizeRow(row) {
  const doc = { ...row };
  for (const [key, value] of Object.entries(doc)) {
    if (value instanceof Date) {
      doc[key] = value.toISOString();
    }
  }
  return doc;
}
