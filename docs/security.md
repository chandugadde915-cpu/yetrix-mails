# Security And Production Readiness

## Must-Have Before Real Customers

- Replace the temporary `admin` / `admin` frontend demo login with real backend authentication.
- Keep `MAILCOW_API_KEY` only in backend environment variables.
- Never call the Mailcow API directly from the Vercel frontend.
- Restrict CORS with `CORS_ORIGIN` to the deployed frontend domain only.
- Keep the Mailcow admin UI internal/admin-only.
- Real user authentication with MFA-ready account recovery.
- Workspace roles: owner, admin, support, billing.
- Per-workspace authorization on every domain and mailbox query.
- Password reset flow for mailbox users.
- DKIM private keys stored in AWS Secrets Manager or encrypted KMS storage.
- Rate limits on domain creation, mailbox creation, login, SMTP submission, and outbound mail.
- Abuse detection for bulk sending and compromised mailboxes.
- Full audit log for admin actions.
- TLS-only SMTP submission and IMAP.
- Backups with restore drills.
- Monitoring for queue depth, bounce rate, spam rate, disk usage, and blacklists.

## Current Dependency Note

As of this scaffold, `next@16.2.6` is the latest available version and still reports a moderate npm audit advisory through its internal `postcss@8.4.31` dependency. The app also pins direct `postcss@8.5.10`, but npm audit continues to report the transitive Next package until Next publishes a patched dependency tree.

## Email-Specific Controls

- Do not allow open relay behavior.
- Require SPF, DKIM, and DMARC before marking a domain production-ready.
- Start new domains with strict outbound limits.
- Keep per-domain and per-mailbox send limits.
- Track bounces and complaints.
- Suspend compromised mailboxes quickly.
- Keep reverse DNS aligned with `mail.yourmailplatform.com`.

## AWS Security

- Keep RDS and Redis private.
- Limit SSH to your admin IP or use SSM Session Manager.
- Use Secrets Manager for database URLs, JWT secrets, and DKIM keys.
- Encrypt EBS and RDS.
- Enable CloudWatch alarms for CPU, disk, queue size, and rejected SMTP volume.
- Use IAM roles for ECS tasks instead of static AWS keys.
