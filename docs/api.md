# API Contract

Base URL:

```text
https://api.yetrixtechnologies.com
```

## Response Shape

```json
{ "success": true, "data": {} }
```

```json
{ "success": false, "error": "message" }
```

## Health

```text
GET /health
GET /api/status
GET /api/audit
```

`/api/status` includes backend health and private mail-engine connection status.

All `/api/*` routes require:

```text
Authorization: Bearer <token>
```

Get the token from:

```text
POST /auth/login
POST /auth/signup
```

## Workspace And Users

```text
GET    /api/workspace
PUT    /api/workspace
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

## Domains

```text
GET    /api/domains
POST   /api/domains
DELETE /api/domains/:domain
GET    /api/domains/:domain/dns-status
```

Create body:

```json
{
  "domain": "yetrixtechnologies.com",
  "description": "Primary mail domain"
}
```

## Mailboxes

```text
GET    /api/mailboxes
POST   /api/mailboxes
PUT    /api/mailboxes/:email
DELETE /api/mailboxes/:email
POST   /api/mailboxes/:email/password
POST   /api/mailboxes/:email/disable
POST   /api/mailboxes/:email/enable
```

Create body:

```json
{
  "email": "admin@yetrixtechnologies.com",
  "name": "Admin",
  "password": "StrongPassword123!",
  "quotaMb": 2048
}
```

Update body:

```json
{
  "quotaMb": 4096,
  "active": true
}
```

Password body:

```json
{
  "password": "NewStrongPassword123!"
}
```

## Aliases

```text
GET    /api/aliases
POST   /api/aliases
DELETE /api/aliases/:id
```

Create body:

```json
{
  "address": "support@yetrixtechnologies.com",
  "goto": "admin@yetrixtechnologies.com"
}
```

## Mail Workspace

```text
POST /api/mail/messages
POST /api/mail/send
```

Inbox sync body:

```json
{
  "email": "admin@yetrixtechnologies.com",
  "password": "MailboxPassword123!",
  "limit": 20
}
```

Send body:

```json
{
  "from": "admin@yetrixtechnologies.com",
  "password": "MailboxPassword123!",
  "to": "customer@example.com",
  "subject": "Hello",
  "text": "Message body"
}
```
