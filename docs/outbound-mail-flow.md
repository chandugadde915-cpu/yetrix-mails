# Outbound Mail Flow

Yetrix Mail sends outbound customer mail through Mailcow. The app must not send directly to
Amazon SES, Gmail, Outlook, or any other recipient provider.

```text
Frontend
  -> Backend API
  -> Mailcow SMTP
  -> Mailcow Postfix
  -> Amazon SES relayhost
  -> Recipient MX (Gmail, Outlook, Yahoo, etc.)
```

## Responsibilities

- Frontend sends compose requests only to the Yetrix Backend API.
- Backend validates the mailbox session, workspace access, message body, and attachments.
- Backend sends the message to Mailcow SMTP using `MAIL_SMTP_HOST` and related SMTP env vars.
- Backend saves a copy into the sender's Mailcow Sent folder using IMAP append after SMTP succeeds.
- Backend stores app mail records in MongoDB and stores attachment files on local disk.
- Mailcow Postfix handles final outbound routing and relays to Amazon SES.
- Amazon SES credentials are configured only inside Mailcow relayhost settings.

## Backend SMTP Environment

Production should point the app to Mailcow SMTP:

```env
MAIL_SMTP_HOST=mail.yetrixtechnologies.com
MAIL_SMTP_PORT=587
MAIL_SMTP_SECURE=false
MAIL_SMTP_REQUIRE_TLS=true
```

Optional `MAIL_SMTP_USER` and `MAIL_SMTP_PASS` are supported for a Mailcow SMTP account if a
future deployment uses a dedicated authenticated Mailcow sender. They must not contain Amazon SES
SMTP credentials in the Yetrix app.

## Mailcow Relayhost

Configure Amazon SES inside Mailcow, not inside the Yetrix app:

```text
Relay host: email-smtp.<aws-region>.amazonaws.com
Port: 587
TLS: enabled
Username: SES SMTP username
Password: SES SMTP password
```

After relayhost setup, flush queued mail from the Mailcow server:

```bash
cd /opt/mailcow-dockerized
sudo docker compose exec postfix-mailcow postqueue -f
```

## Status Checks

`GET /api/status` exposes safe SMTP state only:

- SMTP connected/disconnected
- SMTP mode: `mailcow-relay`
- Whether host and port are configured
- TLS mode flags

It must never expose SMTP passwords, Mailcow API keys, SES credentials, mailbox passwords, or other
secrets.
