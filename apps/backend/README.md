# Backend

NestJS API that exposes clean REST endpoints for the Vercel frontend and calls Mailcow securely on the server.

## Environment

```text
MAILCOW_BASE_URL=https://mail.yetrixmails.com
MAILCOW_API_KEY=your_mailcow_api_key
MAIL_DOMAIN=yetrixtechnologies.com
MAIL_SERVER_IP=56.228.11.175
PORT=4000
CORS_ORIGIN=https://your-vercel-frontend-domain
```

## Endpoints

```text
GET    /health
GET    /api/status
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
```

All responses use:

```json
{ "success": true, "data": {} }
```

or:

```json
{ "success": false, "error": "message" }
```
