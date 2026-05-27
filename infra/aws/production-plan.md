# AWS Production Plan

## Recommended MVP Services

```text
EC2 mail node
ECS Fargate backend API
ECS Fargate worker service
RDS PostgreSQL
ElastiCache Redis
S3 backups
CloudWatch logs
Secrets Manager
Route 53 hosted zone for platform domain
```

## Security Groups

### Mail Node

Inbound:

```text
25/tcp    0.0.0.0/0
465/tcp   0.0.0.0/0
587/tcp   0.0.0.0/0
993/tcp   0.0.0.0/0
80/tcp    0.0.0.0/0
443/tcp   0.0.0.0/0
22/tcp    your_admin_ip_only
```

Outbound:

```text
25/tcp    internet
443/tcp   internet
5432/tcp  RDS security group
6379/tcp  Redis security group
```

### Backend API

Inbound:

```text
443/tcp from ALB
```

Outbound:

```text
5432/tcp to RDS
6379/tcp to Redis
443/tcp to internet
```

## AWS Notes

- Request AWS to remove EC2 port 25 throttling before sending production email.
- Attach an Elastic IP to the mail node and configure reverse DNS.
- Keep RDS and Redis private.
- Store database passwords, DKIM private keys, and JWT secrets in Secrets Manager.
- Use S3 lifecycle policies for mail backups and archived logs.

## First Deployment Order

1. Create VPC, subnets, security groups, RDS, Redis, and S3.
2. Launch mail EC2 with Elastic IP.
3. Configure `mail.yourmailplatform.com` DNS and reverse DNS.
4. Install Postfix, Dovecot, Rspamd, OpenDKIM, Nginx, and Roundcube.
5. Deploy backend API.
6. Deploy frontend to Vercel.
7. Test with a non-critical domain.
