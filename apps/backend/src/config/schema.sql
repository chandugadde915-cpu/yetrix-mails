CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  domain TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_dns',
  dkim_selector TEXT NOT NULL DEFAULT 'default',
  dkim_public_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mailboxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  domain_id UUID NOT NULL REFERENCES domains(id),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  quota_mb INTEGER NOT NULL DEFAULT 2048,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES domains(id),
  source_email TEXT NOT NULL,
  destination_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dns_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES domains(id),
  mx_ok BOOLEAN NOT NULL DEFAULT false,
  spf_ok BOOLEAN NOT NULL DEFAULT false,
  dkim_ok BOOLEAN NOT NULL DEFAULT false,
  dmarc_ok BOOLEAN NOT NULL DEFAULT false,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_domains_workspace_id ON domains(workspace_id);
CREATE INDEX idx_mailboxes_workspace_id ON mailboxes(workspace_id);
CREATE INDEX idx_mailboxes_domain_id ON mailboxes(domain_id);
CREATE INDEX idx_aliases_domain_id ON aliases(domain_id);
