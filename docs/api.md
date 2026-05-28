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
```

`/api/status` includes backend health and Mailcow connection status.

## Domains

```text
GET    /api/domains
POST   /api/domains
DELETE /api/domains/:domain
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
