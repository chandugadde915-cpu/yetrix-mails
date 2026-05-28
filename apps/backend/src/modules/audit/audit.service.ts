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
      await this.database.query(
        "INSERT INTO audit_events(workspace_id, actor, action, target) VALUES ($1, $2, $3, $4)",
        [workspaceId, actor ?? "admin", action, target],
      );
    }

    return event;
  }

  async list(workspaceId?: string, includeAll = false) {
    if (this.database.enabled && includeAll) {
      const result = await this.database.query<{
        id: string;
        action: string;
        target: string;
        actor: string;
        created_at: string;
      }>(
        `
          SELECT id, action, target, actor, created_at
          FROM audit_events
          ORDER BY created_at DESC
          LIMIT 250
        `,
      );
      return result.rows.map((row) => ({
        id: row.id,
        action: row.action,
        target: row.target,
        actor: row.actor,
        createdAt: row.created_at,
      }));
    }

    if (this.database.enabled && workspaceId) {
      const result = await this.database.query<{
        id: string;
        action: string;
        target: string;
        actor: string;
        created_at: string;
      }>(
        `
          SELECT id, action, target, actor, created_at
          FROM audit_events
          WHERE workspace_id = $1
          ORDER BY created_at DESC
          LIMIT 100
        `,
        [workspaceId],
      );
      return result.rows.map((row) => ({
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
