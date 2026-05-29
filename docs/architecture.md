# Vercel + AWS Email Hosting Architecture

## High-Level System

```text
Browser
  |
  v
Vercel CDN + Next.js Frontend
  |
  | HTTPS / JWT
  v
AWS ALB or API Gateway
  |
  v
NestJS Backend API
  |
  +-- MongoDB Atlas: users, workspaces, domains, mailboxes, aliases, mail data
  +-- Local disk: physical attachment files
  +-- BullMQ Workers: DNS checks, provisioning, logs
  +-- S3: backups, exports, archived logs
  |
  v
AWS Mail Node
  |
  +-- Postfix: SMTP send/receive
  +-- Dovecot: IMAP/auth
  +-- OpenDKIM: DKIM signing
  +-- Rspamd: spam filtering
  +-- Roundcube: webmail
  +-- EBS: Maildir storage
```

## AWS Network Layout

```text
AWS VPC
  |
  +-- Public subnets
  |     +-- Application Load Balancer
  |     +-- Mail EC2 with Elastic IP
  |     +-- NAT Gateway
  |
  +-- Private subnets
        +-- Backend ECS service or EC2
        +-- Worker ECS service or EC2
        +-- Backend EC2/ECS attachment volume
        +-- Private outbound access to MongoDB Atlas
```

## Customer Domain Flow

```text
User enters company.com
  |
  v
Backend creates pending domain
  |
  v
Backend generates required DNS records
  |
  v
User adds DNS records at domain registrar
  |
  v
DNS worker checks MX/SPF/DKIM/DMARC
  |
  v
Domain becomes active
  |
  v
User creates info@company.com
  |
  v
Mailbox metadata is mirrored into MongoDB Atlas
  |
  v
Postfix/Dovecot can authenticate and route mail
```

## Required DNS Records

For `company.com`:

```text
MX    company.com              mail.yourmailplatform.com
TXT   company.com              v=spf1 mx include:yourmailplatform.com ~all
TXT   default._domainkey       DKIM public key
TXT   _dmarc                   v=DMARC1; p=quarantine; rua=mailto:dmarc@yourmailplatform.com
CNAME webmail                  webmail.yourmailplatform.com
```

## Core MongoDB Collections

```text
users
workspaces
domains
dns_records
mailboxes
aliases
folders
conversations
messages
attachments
sessions
audit_logs
app_settings
mail_sync_logs
```

## Deployment Model

### Vercel

- Deploy `apps/frontend`.
- Set `NEXT_PUBLIC_API_URL=https://api.yourmailplatform.com`.
- Use Git integration for preview deployments.

### AWS Backend

- Run `apps/backend` on ECS Fargate or EC2.
- Put it behind an ALB or API Gateway.
- Store secrets in AWS Secrets Manager.
- Restrict MongoDB Atlas network access to trusted backend egress IPs.

### AWS Mail

- Run mail services on EC2 with a static Elastic IP.
- Use EBS for `/var/mail/vhosts`.
- Back up mailbox data to S3.
- Open only required ports.

```text
25    SMTP receiving
465   SMTPS
587   SMTP submission
993   IMAPS
80    HTTP challenge/redirect
443   Webmail/admin HTTPS
```

## Scaling Later

Start with one mail node. After the MVP works:

- Split outbound SMTP from inbound MX.
- Add secondary MX.
- Add mailbox shard mapping.
- Move logs into OpenSearch or ClickHouse.
- Add abuse detection and outbound rate limits.
- Add per-domain DKIM key rotation.
