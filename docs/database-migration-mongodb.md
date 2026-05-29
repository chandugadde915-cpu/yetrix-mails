# MongoDB Atlas Migration

Yetrix Mail is MongoDB Atlas-first. PostgreSQL is no longer part of the production runtime.

## Production Data Stores

```text
MongoDB Atlas:
- users
- workspaces
- domains
- mailboxes
- aliases
- dns_records
- folders
- conversations
- messages
- attachments
- sessions
- audit_logs
- app_settings
- mail_sync_logs

Local disk:
- physical attachment files

Mailcow:
- mailbox auth
- IMAP/SMTP
- DKIM
- delivery and routing
```

## Required Backend Environment

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/yetrix_mail
MONGODB_DB=yetrix_mail
MAILBOX_CREDENTIAL_ENCRYPTION_KEY=strong_32_byte_key
LOCAL_MAIL_STORAGE_DIR=/app/storage
```

`DATABASE_URL` should be removed from production.

## Seed First Superadmin

Run this after setting `MONGODB_URI`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `AUTH_SECRET`, and
`MAIL_DOMAIN`:

```bash
cd /opt/yetrix-mails/apps/backend
npm run seed:superadmin
```

The script creates or updates the bootstrap user as `superadmin`.

## Optional One-Time PostgreSQL Import

If the old PostgreSQL database still contains data, run the migration before deleting old storage:

```bash
cd /opt/yetrix-mails/apps/backend
npm install pg
DATABASE_URL=postgresql://... MONGODB_URI=mongodb+srv://... npm run migrate:postgres-to-mongo
```

The script copies old tables into MongoDB collections:

```text
workspaces -> workspaces
users -> users
domains -> domains
mailboxes -> mailboxes
aliases -> aliases
dns_checks -> dns_records
audit_events -> audit_logs
sent_attachments -> attachments
```

After migration, remove `DATABASE_URL` and rebuild the backend.
