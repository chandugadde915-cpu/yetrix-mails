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
POST   /api/workspace/sync
POST   /api/me/password
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

`POST /api/workspace/sync` pulls domains, mailboxes, and aliases from Mailcow and records the visible tenant-owned objects in the Yetrix workspace database.

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
PUT    /api/aliases/:id
DELETE /api/aliases/:id
```

Create body:

```json
{
  "address": "support@yetrixtechnologies.com",
  "goto": "admin@yetrixtechnologies.com"
}
```

Update body:

```json
{
  "goto": "helpdesk@yetrixtechnologies.com",
  "active": true
}
```

## Mail Workspace

```text
POST /api/mail/connection-test
POST /api/mail/folders
POST /api/mail/messages
POST /api/mail/message
POST /api/mail/message/delete
POST /api/mail/send
```

Connection test body:

```json
{
  "email": "admin@yetrixtechnologies.com",
  "password": "MailboxPassword123!"
}
```

Inbox sync body:

```json
{
  "email": "admin@yetrixtechnologies.com",
  "password": "MailboxPassword123!",
  "folder": "INBOX",
  "search": "invoice",
  "limit": 20
}
```

Read or delete message body:

```json
{
  "email": "admin@yetrixtechnologies.com",
  "password": "MailboxPassword123!",
  "id": "123"
}
```

## Operations

```text
GET  /api/operations/summary
GET  /api/operations/routing
GET  /api/operations/dkim/:domain
POST /api/operations/dkim/:domain
GET  /api/operations/quarantine
GET  /api/operations/logs
```

Operations endpoints keep Mailcow API keys backend-only and return safe fallback payloads when a
Mailcow feature is not available on the current server version.

## Roles

`superadmin` can view global domains, mailboxes, aliases, users, audit events, and operations across
all workspaces. Tenant roles remain `owner`, `admin`, `support`, and `viewer`; missing tenant
workspace context should resolve to setup/empty states instead of a 503 response.

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
