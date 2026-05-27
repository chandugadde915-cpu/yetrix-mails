# Deployment Guide

## 1. Frontend on Vercel

Project root:

```text
apps/frontend
```

Environment variable:

```text
NEXT_PUBLIC_API_URL=https://api.yourmailplatform.com
```

Production domain:

```text
app.yourmailplatform.com
```

Recommended setup:

1. Import the repository into Vercel.
2. Set the root directory to `apps/frontend`.
3. Add `NEXT_PUBLIC_API_URL`.
4. Point `app.yourmailplatform.com` to Vercel.

## 2. Backend on AWS

Recommended MVP:

```text
ECS Fargate service behind an Application Load Balancer
```

Environment variables:

```text
NODE_ENV=production
PORT=4000
APP_BASE_URL=https://app.yourmailplatform.com
DATABASE_URL=postgres://...
REDIS_URL=redis://...
MAIL_HOSTNAME=mail.yourmailplatform.com
WEBMAIL_URL=https://webmail.yourmailplatform.com
DKIM_SELECTOR=default
```

Production domain:

```text
api.yourmailplatform.com
```

## 3. Mail Node on AWS EC2

Use a dedicated EC2 instance first.

Recommended minimum:

```text
t3.medium or t3.large
100 GB gp3 EBS
Elastic IP
Ubuntu LTS
```

Install:

```text
Postfix
Dovecot
Rspamd
OpenDKIM
Nginx
Roundcube
Certbot
```

Mailbox storage:

```text
/var/mail/vhosts/domain.com/user/
```

## 4. Platform DNS

```text
app.yourmailplatform.com       Vercel
api.yourmailplatform.com       AWS ALB
mail.yourmailplatform.com      AWS Elastic IP
webmail.yourmailplatform.com   AWS Elastic IP or ALB
```

## 5. Email Reputation Checklist

- Request AWS port 25 removal.
- Configure reverse DNS for the Elastic IP.
- Set SPF for the platform domain.
- Sign outgoing email with DKIM.
- Publish DMARC for the platform domain.
- Start with low outbound limits.
- Track bounces and complaints.
- Monitor blacklists.
