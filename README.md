# OwnMail Platform Starter

Starter architecture for a custom-domain email hosting SaaS with:

- Frontend on Vercel
- Backend API and workers on AWS
- Mail infrastructure on AWS
- PostgreSQL-backed virtual domains and mailboxes
- Postfix, Dovecot, OpenDKIM, Rspamd, Redis, and Roundcube

## Repository Layout

```text
apps/
  frontend/       Next.js dashboard for Vercel
  backend/        NestJS-style API for AWS
infra/
  aws/            AWS architecture notes and deploy plan
  mail/           Local mail-stack compose/config starter
docs/
  architecture.md Full production architecture
```

## MVP Scope

The first production target is custom-domain email hosting:

1. User signs up.
2. User adds a domain.
3. App shows MX, SPF, DKIM, and DMARC records.
4. DNS checker verifies the records.
5. User creates mailboxes.
6. Postfix and Dovecot authenticate mailboxes from PostgreSQL.
7. User logs into Roundcube webmail.

## Local Development

Frontend:

```bash
cd apps/frontend
npm install
npm run dev
```

Backend:

```bash
cd apps/backend
npm install
npm run start:dev
```

Mail stack:

```bash
cd infra/mail
docker compose up -d
```

## Verified Locally

The scaffold has been checked with:

```bash
npm --workspace apps/frontend run typecheck
npm --workspace apps/backend run typecheck
npm --workspace apps/frontend run build
npm --workspace apps/backend run build
```

## Production Domains

```text
app.yourmailplatform.com      Vercel frontend
api.yourmailplatform.com      AWS backend API
mail.yourmailplatform.com     AWS SMTP/IMAP mail node
webmail.yourmailplatform.com  Roundcube webmail
```

## Important

Do not send real customer email from a new AWS IP immediately. Start with test domains, configure SPF/DKIM/DMARC correctly, monitor blacklists, and warm IP reputation gradually.

## Production Readiness Docs

- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Security](docs/security.md)
- [API](docs/api.md)
- [GitHub publishing](docs/github.md)
