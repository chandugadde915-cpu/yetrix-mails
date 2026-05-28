import { ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { hashPassword, verifyPassword } from "../../common/password";
import { DatabaseService } from "../database/database.service";

export interface WorkspaceRow {
  id: string;
  name: string;
  status: string;
  created_at: string;
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
  constructor(private readonly database: DatabaseService) {}

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
}
