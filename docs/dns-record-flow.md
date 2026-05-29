# DNS Record Flow

Domain management is controlled by the Yetrix backend. The frontend never calls Mailcow directly.

```text
Frontend
  -> Backend API
  -> Mailcow API for domain/DKIM operations
  -> MongoDB Atlas for app records and latest DNS status
  -> Node DNS resolver for verification
```

## Add Domain

1. Admin submits a domain from the frontend.
2. Backend validates workspace access.
3. Backend creates or links the domain in Mailcow.
4. Backend mirrors the domain in MongoDB `domains`.
5. Backend returns required DNS records to the frontend.

## Required Records

- MX
- SPF
- DKIM
- DMARC
- A/autodiscover/autoconfig records when used by the mail setup

Mailcow remains the source for DKIM generation. MongoDB stores generated records and the latest
verification result.

## Verify DNS

The backend exposes:

```text
GET  /api/domains/:domain/dns-records
POST /api/domains/:domain/check-dns
GET  /api/domains/:domain/dns-status
```

The checker uses Node DNS resolution and stores results in MongoDB `dns_records`.

## Status Values

```text
pending
verified
failed
```

No DNS provider credentials are stored yet. Customers add the records in their DNS provider manually.
