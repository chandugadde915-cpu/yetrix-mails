# Deployment Guide

## Frontend on Vercel

Project root:

```text
apps/frontend
```

Environment:

```text
NEXT_PUBLIC_API_URL=https://api.yetrixtechnologies.com
```

The frontend calls only your backend API. It never calls the private mail engine directly.

## Backend on EC2

The backend runs on your API server:

```text
API server: https://api.yetrixtechnologies.com
API server IP: 13.53.106.142
Internal port: 4000
```

Environment:

```text
MAILCOW_BASE_URL=https://mail.yetrixtechnologies.com
MAILCOW_API_KEY=your_mailcow_api_key
MAIL_DOMAIN=yetrixtechnologies.com
MAIL_SERVER_IP=56.228.11.175
MAILCOW_DKIM_SELECTOR=dkim
MAIL_CLIENT_HOST=mail.yetrixtechnologies.com
DATABASE_URL=postgresql://ownmail:ownmail@postgres:5432/ownmail
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace_with_a_strong_password
AUTH_SECRET=replace_with_a_long_random_secret
PORT=4000
CORS_ORIGIN=https://www.yetrixtechnologies.com
```

Docker:

```bash
docker compose up -d --build backend
```

Nginx should already map:

```text
https://api.yetrixtechnologies.com -> http://localhost:4000
```

Test:

```bash
curl https://api.yetrixtechnologies.com/health
curl https://api.yetrixtechnologies.com/api/status
```

## Private Mail Engine

Mail engine server:

```text
https://mail.yetrixtechnologies.com
```

Mail server IP:

```text
56.228.11.175
```

Create a mail-engine API key in the internal admin UI and store it only in the backend environment as:

```text
MAILCOW_API_KEY
```

Keep the mail-engine UI internal/admin-only. End users should use only the Yetrix frontend.
