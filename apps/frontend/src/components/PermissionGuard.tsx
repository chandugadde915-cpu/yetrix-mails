import { CurrentUser, hasPermission, PermissionKey } from "@/lib/authz";
import { ReactNode } from "react";

export function PermissionGuard({
  user,
  permission,
  fallback = null,
  children,
}: {
  user: CurrentUser | null | undefined;
  permission: PermissionKey;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  if (!hasPermission(user, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
