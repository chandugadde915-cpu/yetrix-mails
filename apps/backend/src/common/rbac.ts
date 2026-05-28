import { ForbiddenException } from "@nestjs/common";
import { AuthenticatedRequest } from "./auth.middleware";

export type WorkspaceRole = "superadmin" | "owner" | "admin" | "support" | "viewer";

export function requireRole(req: AuthenticatedRequest, allowed: WorkspaceRole[]) {
  const role = req.user?.role as WorkspaceRole | undefined;
  if (!role || !allowed.includes(role)) {
    throw new ForbiddenException("You do not have permission to perform this action");
  }
}

export function isSuperAdmin(req: AuthenticatedRequest) {
  return req.user?.role === "superadmin";
}

export const adminRoles: WorkspaceRole[] = ["superadmin", "owner", "admin"];
export const operatorRoles: WorkspaceRole[] = ["superadmin", "owner", "admin", "support"];
