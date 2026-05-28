# Backend

NestJS API that exposes clean REST endpoints for the Vercel frontend, stores tenant data, and calls the private mail engine securely on the server.

## Environment

```text
MAILCOW_BASE_URL=https://mail.yetrixtechnologies.com
MAILCOW_API_KEY=your_mailcow_api_key
MAIL_DOMAIN=yetrixtechnologies.com
MAIL_SERVER_IP=56.228.11.175
MAILCOW_DKIM_SELECTOR=dkim
MAIL_CLIENT_HOST=mail.yetrixtechnologies.com
LOCAL_MAIL_STORAGE_DIR=/app/storage/sent-attachments
RATE_LIMIT_PER_WINDOW=240
RATE_LIMIT_WINDOW_MS=60000
PLAN_NAME=Launch
PLAN_LIMIT_DOMAINS=3
PLAN_LIMIT_MAILBOXES=25
PLAN_LIMIT_ALIASES=100
PLAN_LIMIT_USERS=10
PLAN_LIMIT_STORAGE_MB=25600
DATABASE_URL=postgresql://ownmail:ownmail@postgres:5432/ownmail
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace_with_a_strong_password
AUTH_SECRET=replace_with_a_long_random_secret
PORT=4000
CORS_ORIGIN=https://www.yetrixtechnologies.com
```

## Endpoints

```text
GET    /health
POST   /auth/login
POST   /auth/signup
GET    /api/status
GET    /api/audit
GET    /api/workspace
GET    /api/billing/usage
GET    /api/workspaces
PUT    /api/workspace
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
GET    /api/domains
POST   /api/domains
DELETE /api/domains/:domain
GET    /api/mailboxes
POST   /api/mailboxes
PUT    /api/mailboxes/:email
DELETE /api/mailboxes/:email
POST   /api/mailboxes/:email/password
POST   /api/mailboxes/:email/disable
POST   /api/mailboxes/:email/enable
GET    /api/aliases
POST   /api/aliases
DELETE /api/aliases/:id
POST   /api/mail/messages
POST   /api/mail/message
POST   /api/mail/message/archive
POST   /api/mail/message/trash
POST   /api/mail/message/delete
POST   /api/mail/contacts
POST   /api/mail/send
POST   /public/mail/connection-test
POST   /public/mail/messages
POST   /public/mail/message
POST   /public/mail/send
```

`POST /api/mail/send` accepts up to five base64 attachments. Sent files are saved under
`LOCAL_MAIL_STORAGE_DIR` before SMTP delivery and metadata is recorded in `sent_attachments` when
the database is enabled.

`/public/mail/*` powers the separate mailbox-user portal. It requires the mailbox email and mailbox
password, but not an admin dashboard token.

All responses use:

```json
{ "success": true, "data": {} }
```

or:

```json
{ "success": false, "error": "message" }
```
