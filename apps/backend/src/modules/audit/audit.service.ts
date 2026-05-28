import { Injectable } from "@nestjs/common";

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

  record(action: string, target: string, actor = "admin") {
    const event = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action,
      target,
      actor,
      createdAt: new Date().toISOString(),
    };

    this.events.unshift(event);
    this.events.splice(100);
    return event;
  }

  list() {
    return this.events;
  }
}
