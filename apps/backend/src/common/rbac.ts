import { ForbiddenException } from "@nestjs/common";
import { AuthenticatedRequest } from "./auth.middleware";

export type WorkspaceRole = "owner" | "admin" | "support" | "viewer";

export function requireRole(req: AuthenticatedRequest, allowed: WorkspaceRole[]) {
  const role = req.user?.role as WorkspaceRole | undefined;
  if (!role || !allowed.includes(role)) {
    throw new ForbiddenException("You do not have permission to perform this action");
  }
}

export const adminRoles: WorkspaceRole[] = ["owner", "admin"];
export const operatorRoles: WorkspaceRole[] = ["owner", "admin", "support"];
