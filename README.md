# Yetrix Mails Control Panel

SaaS mail control panel with:

- Frontend on Vercel
- Backend API at `https://api.yetrixtechnologies.com`
- Private mail engine at `https://mail.yetrixtechnologies.com`
- Clean frontend REST API calls through the backend only

Mail engine API keys are never exposed to the browser. The frontend talks only to the backend; the backend talks to the mail engine with `MAILCOW_API_KEY` from server environment variables.

## Repository Layout

```text
apps/
  frontend/       Next.js dashboard for Vercel
  backend/        NestJS API, tenant, and mail control layer
docs/
  api.md          Backend API contract
  deployment.md   Vercel, Docker, database, and mail engine setup
```

## Frontend Flow

```text
Vercel UI
  -> https://api.yetrixtechnologies.com
  -> Tenant API + Mail API
  -> Private mail engine
```

Pages:

```text
/
/login
/signup
/dashboard
/setup
/domains
/mailboxes
/aliases
/webmail
/operations
/superadmin
/billing
/settings
```

Product screen assignment:

```text
Visitor          -> Landing, Signup, Login
Workspace admin  -> Dashboard, Domains, Mailboxes, Aliases, Billing, Settings
Mailbox user     -> Mail Workspace
Operator         -> Operations, routing, logs, health
Superadmin       -> Superadmin global tenant console
```

The production workspace flow is:

```text
Login
  -> Add domain
  -> Verify MX/A/SPF/DKIM/DMARC
  -> Create mailbox
  -> Open Yetrix Mail Workspace
  -> Test mailbox login
  -> Sync inbox
  -> Search folders
  -> Send self-test or outside test email
  -> Attach files when sending
  -> Read/delete messages through backend IMAP/SMTP
```

Backend admin login:

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace_with_a_strong_password
AUTH_SECRET=replace_with_a_long_random_secret
```

The Vercel login page calls the backend `/auth/login` endpoint. The frontend stores the returned token in an HTTP-only cookie and proxies browser mutations through Next.js route handlers.

## Backend Environment

```text
MAILCOW_BASE_URL=https://mail.yetrixtechnologies.com
MAILCOW_API_KEY=your_mailcow_api_key
MAIL_DOMAIN=yetrixtechnologies.com
MAIL_SERVER_IP=56.228.11.175
MAILCOW_DKIM_SELECTOR=dkim
MAIL_CLIENT_HOST=mail.yetrixtechnologies.com
LOCAL_MAIL_STORAGE_DIR=/app/storage/sent-attachments
DATABASE_URL=postgresql://ownmail:ownmail@postgres:5432/ownmail
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace_with_a_strong_password
AUTH_SECRET=replace_with_a_long_random_secret
PORT=4000
CORS_ORIGIN=https://www.yetrixtechnologies.com
```

## Vercel Environment

```text
API_URL=https://api.yetrixtechnologies.com
NEXT_PUBLIC_API_URL=https://api.yetrixtechnologies.com
NEXT_PUBLIC_APP_URL=https://www.yetrixtechnologies.com
NEXT_PUBLIC_MAIL_DOMAIN=yetrixtechnologies.com
NEXT_PUBLIC_MAIL_CLIENT_HOST=mail.yetrixtechnologies.com
```

## Docker Backend

```bash
docker compose up -d --build backend
```

The backend listens on port `4000`. Your existing Nginx reverse proxy should map:

```text
https://api.yetrixtechnologies.com -> http://localhost:4000
```

## Verified Locally

```bash
npm --workspace apps/frontend run typecheck
npm --workspace apps/backend run typecheck
npm --workspace apps/frontend run build
npm --workspace apps/backend run build
```

## Notes

- The mail engine UI should remain internal/admin-only.
- Frontend must never call the mail engine directly.
- DNS status, CRUD, Mailcow sync, operations, inbox sync, reading, deletion, and sending go through the backend.
- Admin/operator actions are role-gated in the backend. The bootstrap admin is promoted to `superadmin` by default, which can see global domains, mailboxes, aliases, users, audit, and operations across workspaces.
- Tenant pages handle missing workspace context as setup/empty state instead of crashing with a 503.
