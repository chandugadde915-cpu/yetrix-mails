import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface AuditEvent {
  id: string;
  action: string;
  target: string;
  actor: string;
  createdAt: string;
}

@Injectable()
export class AuditService {
  private readonly events: AuditEvent[] = [];

  constructor(private readonly database: DatabaseService) {}

  async record(action: string, target: string, actor?: string, workspaceId?: string) {
    const event = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action,
      target,
      actor: actor ?? "admin",
      createdAt: new Date().toISOString(),
    };

    this.events.unshift(event);
    this.events.splice(100);

    if (this.database.enabled && workspaceId) {
      await this.database.recordAudit({ workspaceId, actor: actor ?? "admin", action, target });
    }

    return event;
  }

  async list(workspaceId?: string, includeAll = false) {
    if (this.database.enabled && includeAll) {
      const rows = await this.database.listAudit(null, 250);
      return rows.map((row) => ({
        id: row.id,
        action: row.action,
        target: row.target,
        actor: row.actor,
        createdAt: row.created_at,
      }));
    }

    if (this.database.enabled && workspaceId) {
      const rows = await this.database.listAudit(workspaceId, 100);
      return rows.map((row) => ({
        id: row.id,
        action: row.action,
        target: row.target,
        actor: row.actor,
        createdAt: row.created_at,
      }));
    }

    return this.events;
  }
}
