# Yetrix Mails Control Panel

SaaS mail control panel with:

- Frontend on Vercel
- Backend API at `https://api.yetrixtechnologies.com`
- Mailcow as the backend mail engine at `https://mail.yetrixmails.com`
- Clean frontend REST API calls through the backend only

Mailcow API keys are never exposed to the browser. The frontend talks only to the backend; the backend talks to Mailcow with `MAILCOW_API_KEY` from server environment variables.

## Repository Layout

```text
apps/
  frontend/       Next.js dashboard for Vercel
  backend/        NestJS API proxy/control layer for Mailcow
docs/
  api.md          Backend API contract
  deployment.md   Vercel, Docker, and Mailcow setup
```

## Frontend Flow

```text
Vercel UI
  -> https://api.yetrixtechnologies.com
  -> Mailcow API
  -> https://mail.yetrixmails.com
```

Pages:

```text
/
/login
/dashboard
/domains
/mailboxes
/aliases
/settings
```

Temporary demo login:

```text
username: admin
password: admin
```

Replace this with real backend authentication before real users.

## Backend Environment

```text
MAILCOW_BASE_URL=https://mail.yetrixmails.com
MAILCOW_API_KEY=your_mailcow_api_key
MAIL_DOMAIN=yetrixtechnologies.com
MAIL_SERVER_IP=56.228.11.175
PORT=4000
CORS_ORIGIN=https://your-vercel-frontend-domain
```

## Vercel Environment

```text
NEXT_PUBLIC_API_URL=https://api.yetrixtechnologies.com
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

- Mailcow admin UI should remain admin-only.
- Frontend must never call Mailcow directly.
- DNS status in the UI is a placeholder until live DNS verification is added.
