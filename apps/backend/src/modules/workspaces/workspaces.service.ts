import { ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { hashPassword, verifyPassword } from "../../common/password";
import { DatabaseService } from "../database/database.service";

export interface WorkspaceRow {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export interface WorkspaceInventoryRow extends WorkspaceRow {
  domains: string;
  mailboxes: string;
  aliases: string;
  users: string;
}

export interface UserRow {
  id: string;
  workspace_id?: string;
  workspace_name?: string;
  email: string;
  username: string | null;
  name: string | null;
  password_hash?: string;
  role: string;
  status: string;
  created_at: string;
}

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async getWorkspace(workspaceId?: string, includeAll = false) {
    if (!this.database.enabled) {
      return null;
    }

    if (includeAll) {
      const counts = await this.database.query<{
        workspaces: string;
        domains: string;
        mailboxes: string;
        aliases: string;
        users: string;
      }>(
        `
          SELECT
            (SELECT count(*) FROM workspaces) AS workspaces,
            (SELECT count(*) FROM domains) AS domains,
            (SELECT count(*) FROM mailboxes) AS mailboxes,
            (SELECT count(*) FROM aliases) AS aliases,
            (SELECT count(*) FROM users) AS users
        `,
      );

      return {
        id: "superadmin",
        name: "Superadmin Console",
        status: "active",
        created_at: new Date().toISOString(),
        counts: {
          workspaces: Number(counts.rows[0]?.workspaces ?? 0),
          domains: Number(counts.rows[0]?.domains ?? 0),
          mailboxes: Number(counts.rows[0]?.mailboxes ?? 0),
          aliases: Number(counts.rows[0]?.aliases ?? 0),
          users: Number(counts.rows[0]?.users ?? 0),
        },
      };
    }

    const id = this.optionalWorkspace(workspaceId);
    if (!id) {
      return null;
    }

    const workspace = await this.database.query<WorkspaceRow>(
      "SELECT id, name, status, created_at FROM workspaces WHERE id = $1",
      [id],
    );
    const counts = await this.database.query<{
      domains: string;
      mailboxes: string;
      aliases: string;
      users: string;
    }>(
      `
        SELECT
          (SELECT count(*) FROM domains WHERE workspace_id = $1) AS domains,
          (SELECT count(*) FROM mailboxes WHERE workspace_id = $1) AS mailboxes,
          (SELECT count(*) FROM aliases WHERE workspace_id = $1) AS aliases,
          (SELECT count(*) FROM users WHERE workspace_id = $1) AS users
      `,
      [id],
    );

    return {
      ...(workspace.rows[0] ?? {
        id,
        name: "Workspace not found",
        status: "missing",
        created_at: new Date().toISOString(),
      }),
      counts: {
        domains: Number(counts.rows[0]?.domains ?? 0),
        mailboxes: Number(counts.rows[0]?.mailboxes ?? 0),
        aliases: Number(counts.rows[0]?.aliases ?? 0),
        users: Number(counts.rows[0]?.users ?? 0),
      },
    };
  }

  async updateWorkspace(workspaceId: string | undefined, name: string) {
    const id = this.requireWorkspace(workspaceId);
    const result = await this.database.query<WorkspaceRow>(
      "UPDATE workspaces SET name = $2, updated_at = now() WHERE id = $1 RETURNING id, name, status, created_at",
      [id, name.trim()],
    );
    return result.rows[0];
  }

  async listWorkspaces() {
    if (!this.database.enabled) {
      return [];
    }

    const result = await this.database.query<WorkspaceInventoryRow>(
      `
        SELECT w.id,
               w.name,
               w.status,
               w.created_at,
               (SELECT count(*) FROM domains d WHERE d.workspace_id = w.id) AS domains,
               (SELECT count(*) FROM mailboxes m WHERE m.workspace_id = w.id) AS mailboxes,
               (SELECT count(*) FROM aliases a WHERE a.workspace_id = w.id) AS aliases,
               (SELECT count(*) FROM users u WHERE u.workspace_id = w.id) AS users
        FROM workspaces w
        ORDER BY w.created_at DESC
      `,
    );

    return result.rows.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      status: workspace.status,
      created_at: workspace.created_at,
      counts: {
        domains: Number(workspace.domains ?? 0),
        mailboxes: Number(workspace.mailboxes ?? 0),
        aliases: Number(workspace.aliases ?? 0),
        users: Number(workspace.users ?? 0),
      },
    }));
  }

  async getBillingUsage(workspaceId?: string, includeAll = false) {
    if (!this.database.enabled) {
      return this.planEnvelope({
        domains: 0,
        mailboxes: 0,
        aliases: 0,
        users: 0,
        storageUsedMb: 0,
        storageLimitMb: 0,
      });
    }

    const id = includeAll ? null : this.optionalWorkspace(workspaceId);
    const result = await this.database.query<{
      domains: string;
      mailboxes: string;
      aliases: string;
      users: string;
      storage_limit_mb: string;
    }>(
      `
        SELECT
          (SELECT count(*) FROM domains WHERE ($1::uuid IS NULL OR workspace_id = $1)) AS domains,
          (SELECT count(*) FROM mailboxes WHERE ($1::uuid IS NULL OR workspace_id = $1)) AS mailboxes,
          (SELECT count(*) FROM aliases WHERE ($1::uuid IS NULL OR workspace_id = $1)) AS aliases,
          (SELECT count(*) FROM users WHERE ($1::uuid IS NULL OR workspace_id = $1)) AS users,
          (SELECT COALESCE(sum(quota_mb), 0) FROM mailboxes WHERE ($1::uuid IS NULL OR workspace_id = $1)) AS storage_limit_mb
      `,
      [id],
    );
    const row = result.rows[0];

    return this.planEnvelope({
      domains: Number(row?.domains ?? 0),
      mailboxes: Number(row?.mailboxes ?? 0),
      aliases: Number(row?.aliases ?? 0),
      users: Number(row?.users ?? 0),
      storageUsedMb: 0,
      storageLimitMb: Number(row?.storage_limit_mb ?? 0),
    });
  }

  async listUsers(workspaceId?: string, includeAll = false) {
    if (!this.database.enabled) {
      return [];
    }

    if (includeAll) {
      const result = await this.database.query<UserRow>(
        `
          SELECT users.id,
                 users.workspace_id,
                 workspaces.name AS workspace_name,
                 users.email,
                 users.username,
                 users.name,
                 users.role,
                 users.status,
                 users.created_at
          FROM users
          LEFT JOIN workspaces ON workspaces.id = users.workspace_id
          ORDER BY workspaces.created_at ASC, users.created_at ASC
        `,
      );
      return result.rows;
    }

    const id = this.optionalWorkspace(workspaceId);
    if (!id) {
      return [];
    }

    const result = await this.database.query<UserRow>(
      `
        SELECT id, email, username, name, role, status, created_at
        FROM users
        WHERE workspace_id = $1
        ORDER BY created_at ASC
      `,
      [id],
    );
    return result.rows;
  }

  async getCurrentUser(
    workspaceId: string | undefined,
    userId: string | undefined,
    includeAll = false,
    fallbackEmail?: string,
    fallbackRole?: string,
  ) {
    if (!this.database.enabled || !userId) {
      return {
        id: userId ?? fallbackEmail ?? "session",
        email: fallbackEmail ?? "admin",
        username: fallbackEmail ?? "admin",
        name: fallbackEmail ?? "Admin",
        role: fallbackRole ?? "admin",
        status: "active",
        workspace_id: workspaceId,
        workspace_name: includeAll ? "Superadmin Console" : "Workspace",
        created_at: null,
      };
    }

    const id = includeAll ? null : this.requireWorkspace(workspaceId);
    const result = await this.database.query<UserRow>(
      `
        SELECT users.id,
               users.workspace_id,
               workspaces.name AS workspace_name,
               users.email,
               users.username,
               users.name,
               users.role,
               users.status,
               users.created_at
        FROM users
        LEFT JOIN workspaces ON workspaces.id = users.workspace_id
        WHERE users.id = $2
          AND ($1::uuid IS NULL OR users.workspace_id = $1)
        LIMIT 1
      `,
      [id, userId],
    );

    return result.rows[0] ?? {
      id: userId,
      email: fallbackEmail ?? "admin",
      username: fallbackEmail ?? "admin",
      name: fallbackEmail ?? "Admin",
      role: fallbackRole ?? "admin",
      status: "active",
      workspace_id: workspaceId,
      workspace_name: includeAll ? "Superadmin Console" : "Workspace",
      created_at: null,
    };
  }

  async createUser(
    workspaceId: string | undefined,
    input: { email: string; name: string; password: string; role?: string },
    canCreateSuperadmin = false,
  ) {
    const id = this.requireWorkspace(workspaceId);
    const email = input.email.trim().toLowerCase();
    const role = this.normalizeAssignableRole(input.role, canCreateSuperadmin);
    const result = await this.database.query<UserRow>(
      `
        INSERT INTO users(workspace_id, username, email, name, password_hash, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, username, name, role, status, created_at
      `,
      [id, email.split("@")[0], email, input.name.trim(), hashPassword(input.password), role],
    );
    return result.rows[0];
  }

  async updateUser(
    workspaceId: string | undefined,
    userId: string,
    input: { name?: string; password?: string; role?: string; status?: string },
    includeAll = false,
  ) {
    const id = includeAll ? null : this.requireWorkspace(workspaceId);
    const role = input.role
      ? this.normalizeAssignableRole(input.role, includeAll)
      : null;
    const result = await this.database.query<UserRow>(
      `
        UPDATE users
        SET name = COALESCE($3, name),
            password_hash = COALESCE($4, password_hash),
            role = COALESCE($5, role),
            status = COALESCE($6, status),
            updated_at = now()
        WHERE ($1::uuid IS NULL OR workspace_id = $1) AND id = $2
        RETURNING id, email, username, name, role, status, created_at
      `,
      [
        id,
        userId,
        input.name ?? null,
        input.password ? hashPassword(input.password) : null,
        role,
        input.status ?? null,
      ],
    );
    return result.rows[0];
  }

  async deleteUser(workspaceId: string | undefined, userId: string, includeAll = false) {
    const id = includeAll ? null : this.requireWorkspace(workspaceId);
    await this.database.query(
      "DELETE FROM users WHERE ($1::uuid IS NULL OR workspace_id = $1) AND id = $2",
      [id, userId],
    );
    return { id: userId };
  }

  async changeOwnPassword(
    workspaceId: string | undefined,
    userId: string | undefined,
    input: { currentPassword: string; newPassword: string },
  ) {
    const id = this.requireWorkspace(workspaceId);
    if (!userId) {
      throw new ServiceUnavailableException("User context is missing");
    }

    const result = await this.database.query<UserRow>(
      `
        SELECT id, email, username, name, password_hash, role, status, created_at
        FROM users
        WHERE workspace_id = $1 AND id = $2
        LIMIT 1
      `,
      [id, userId],
    );
    const user = result.rows[0];

    if (!user?.password_hash || !verifyPassword(input.currentPassword, user.password_hash)) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    await this.database.query(
      "UPDATE users SET password_hash = $3, updated_at = now() WHERE workspace_id = $1 AND id = $2",
      [id, userId, hashPassword(input.newPassword)],
    );

    return { changed: true };
  }

  private requireWorkspace(workspaceId?: string) {
    if (!this.database.enabled) {
      throw new ServiceUnavailableException("DATABASE_URL must be configured for this action");
    }
    if (!workspaceId) {
      throw new ForbiddenException("Workspace setup required");
    }
    return workspaceId;
  }

  private optionalWorkspace(workspaceId?: string) {
    return workspaceId ?? null;
  }

  private normalizeAssignableRole(role: string | undefined, allowSuperadmin: boolean) {
    if (!role) {
      return "admin";
    }

    if (role === "superadmin" && !allowSuperadmin) {
      throw new ForbiddenException("Only a superadmin can assign the superadmin role");
    }

    return role;
  }

  private planEnvelope(usage: {
    domains: number;
    mailboxes: number;
    aliases: number;
    users: number;
    storageUsedMb: number;
    storageLimitMb: number;
  }) {
    const limits = {
      domains: this.config.get<number>("PLAN_LIMIT_DOMAINS", 3),
      mailboxes: this.config.get<number>("PLAN_LIMIT_MAILBOXES", 25),
      aliases: this.config.get<number>("PLAN_LIMIT_ALIASES", 100),
      users: this.config.get<number>("PLAN_LIMIT_USERS", 10),
      storageMb: this.config.get<number>("PLAN_LIMIT_STORAGE_MB", 25 * 1024),
    };

    return {
      plan: this.config.get<string>("PLAN_NAME", "Launch"),
      status: "active",
      renewal: null,
      limits,
      usage: {
        ...usage,
        storageLimitMb: usage.storageLimitMb || limits.storageMb,
      },
      overLimit: {
        domains: usage.domains > limits.domains,
        mailboxes: usage.mailboxes > limits.mailboxes,
        aliases: usage.aliases > limits.aliases,
        users: usage.users > limits.users,
        storage: usage.storageUsedMb > limits.storageMb,
      },
    };
  }
}
