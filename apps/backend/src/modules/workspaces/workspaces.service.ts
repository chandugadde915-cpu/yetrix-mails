import { ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { hashPassword, verifyPassword } from "../../common/password";
import { DatabaseService, UserRow, WorkspaceRow } from "../database/database.service";

export interface WorkspaceInventoryRow extends WorkspaceRow {
  domains: string;
  mailboxes: string;
  aliases: string;
  users: string;
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
      return {
        id: "superadmin",
        name: "Superadmin Console",
        status: "active",
        created_at: new Date().toISOString(),
        counts: await this.counts(null),
      };
    }

    const id = this.optionalWorkspace(workspaceId);
    if (!id) {
      return null;
    }

    return {
      ...(await this.database.getWorkspace(id) ?? {
        id,
        name: "Workspace not found",
        status: "missing",
        created_at: new Date().toISOString(),
      }),
      counts: await this.counts(id),
    };
  }

  async updateWorkspace(workspaceId: string | undefined, name: string) {
    const id = this.requireWorkspace(workspaceId);
    return this.database.updateWorkspace(id, { name: name.trim() });
  }

  async listWorkspaces() {
    if (!this.database.enabled) {
      return [];
    }

    const workspaces = await this.database.listWorkspaces();
    return Promise.all(
      workspaces.map(async (workspace) => ({
        id: workspace.id,
        name: workspace.name,
        status: workspace.status,
        created_at: workspace.created_at,
        counts: await this.counts(workspace.id),
      })),
    );
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
    return this.planEnvelope({
      ...(await this.counts(id)),
      storageUsedMb: 0,
      storageLimitMb: await this.database.totalMailboxQuota(id),
    });
  }

  async listUsers(workspaceId?: string, includeAll = false) {
    if (!this.database.enabled) {
      return [];
    }

    return this.database.listUsers(includeAll ? null : this.optionalWorkspace(workspaceId));
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

    const user = await this.database.findUserById(userId, includeAll ? null : this.requireWorkspace(workspaceId));
    return user ?? {
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
    return this.database.createUser({
      workspaceId: id,
      username: email.split("@")[0],
      email,
      name: input.name.trim(),
      passwordHash: hashPassword(input.password),
      role,
    });
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
      : undefined;
    return this.database.updateUser(userId, {
      workspaceId: id,
      name: input.name,
      passwordHash: input.password ? hashPassword(input.password) : undefined,
      role,
      status: input.status,
    });
  }

  async deleteUser(workspaceId: string | undefined, userId: string, includeAll = false) {
    const id = includeAll ? null : this.requireWorkspace(workspaceId);
    await this.database.deleteUser(userId, id);
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

    const user = await this.database.findUserById(userId, id) as UserRow | null;
    if (!user?.password_hash || !verifyPassword(input.currentPassword, user.password_hash)) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    await this.database.updateUser(userId, {
      workspaceId: id,
      passwordHash: hashPassword(input.newPassword),
    });

    return { changed: true };
  }

  private requireWorkspace(workspaceId?: string) {
    if (!this.database.enabled) {
      throw new ServiceUnavailableException("MONGODB_URI must be configured for this action");
    }
    if (!workspaceId) {
      throw new ForbiddenException("Workspace setup required");
    }
    return workspaceId;
  }

  private optionalWorkspace(workspaceId?: string) {
    return workspaceId ?? null;
  }

  private async counts(workspaceId: string | null) {
    return {
      workspaces: workspaceId ? 1 : await this.database.count("workspaces"),
      domains: await this.database.count("domains", workspaceId),
      mailboxes: await this.database.count("mailboxes", workspaceId),
      aliases: await this.database.count("aliases", workspaceId),
      users: await this.database.count("users", workspaceId),
    };
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
      domains: this.positiveConfigNumber("PLAN_LIMIT_DOMAINS", 3),
      mailboxes: this.positiveConfigNumber("PLAN_LIMIT_MAILBOXES", 25),
      aliases: this.positiveConfigNumber("PLAN_LIMIT_ALIASES", 100),
      users: this.positiveConfigNumber("PLAN_LIMIT_USERS", 10),
      storageMb: this.positiveConfigNumber("PLAN_LIMIT_STORAGE_MB", 25 * 1024),
    };
    const storageLimitMb = usage.storageLimitMb || limits.storageMb;

    return {
      plan: this.config.get<string>("PLAN_NAME", "Launch"),
      status: "active",
      renewal: null,
      limits,
      usage: {
        ...usage,
        storageLimitMb,
      },
      overLimit: {
        domains: usage.domains > limits.domains,
        mailboxes: usage.mailboxes > limits.mailboxes,
        aliases: usage.aliases > limits.aliases,
        users: usage.users > limits.users,
        storage: usage.storageUsedMb > storageLimitMb,
      },
    };
  }

  private positiveConfigNumber(key: string, fallback: number) {
    const value = Number(this.config.get(key) ?? fallback);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
