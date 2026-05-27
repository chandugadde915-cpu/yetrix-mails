# API Contract

Base URL:

```text
https://api.yourmailplatform.com
```

## Health

```text
GET /health
```

## Domains

```text
GET /domains
POST /domains
GET /domains/:domain/dns-records
```

Create domain body:

```json
{
  "domain": "company.com"
}
```

## DNS Checks

```text
GET /dns/:domain/check
```

Returns:

```json
{
  "domain": "company.com",
  "checks": {
    "mx": true,
    "spf": true,
    "dkim": false,
    "dmarc": false
  }
}
```

## Mailboxes

```text
GET /mailboxes
POST /mailboxes
```

Create mailbox body:

```json
{
  "address": "info@company.com",
  "quotaMb": 2048
}
```
