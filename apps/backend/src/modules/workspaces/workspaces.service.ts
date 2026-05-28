import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { hashPassword } from "../../common/password";
import { DatabaseService } from "../database/database.service";

export interface WorkspaceRow {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export interface UserRow {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  role: string;
  status: string;
  created_at: string;
}

@Injectable()
export class WorkspacesService {
  constructor(private readonly database: DatabaseService) {}

  async getWorkspace(workspaceId?: string) {
    const id = this.requireWorkspace(workspaceId);
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
      ...workspace.rows[0],
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

  async listUsers(workspaceId?: string) {
    const id = this.requireWorkspace(workspaceId);
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

  async createUser(workspaceId: string | undefined, input: { email: string; name: string; password: string; role?: string }) {
    const id = this.requireWorkspace(workspaceId);
    const email = input.email.trim().toLowerCase();
    const result = await this.database.query<UserRow>(
      `
        INSERT INTO users(workspace_id, username, email, name, password_hash, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, username, name, role, status, created_at
      `,
      [id, email.split("@")[0], email, input.name.trim(), hashPassword(input.password), input.role ?? "admin"],
    );
    return result.rows[0];
  }

  async updateUser(
    workspaceId: string | undefined,
    userId: string,
    input: { name?: string; password?: string; role?: string; status?: string },
  ) {
    const id = this.requireWorkspace(workspaceId);
    const result = await this.database.query<UserRow>(
      `
        UPDATE users
        SET name = COALESCE($3, name),
            password_hash = COALESCE($4, password_hash),
            role = COALESCE($5, role),
            status = COALESCE($6, status),
            updated_at = now()
        WHERE workspace_id = $1 AND id = $2
        RETURNING id, email, username, name, role, status, created_at
      `,
      [
        id,
        userId,
        input.name ?? null,
        input.password ? hashPassword(input.password) : null,
        input.role ?? null,
        input.status ?? null,
      ],
    );
    return result.rows[0];
  }

  async deleteUser(workspaceId: string | undefined, userId: string) {
    const id = this.requireWorkspace(workspaceId);
    await this.database.query("DELETE FROM users WHERE workspace_id = $1 AND id = $2", [id, userId]);
    return { id: userId };
  }

  private requireWorkspace(workspaceId?: string) {
    if (!workspaceId) {
      throw new ServiceUnavailableException("Workspace context is missing");
    }
    return workspaceId;
  }
}
