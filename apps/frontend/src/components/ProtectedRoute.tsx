import { canAccessRoute, CurrentUser, defaultDashboardForRole, hasPermission, PermissionKey } from "@/lib/authz";
import { apiGetSafe, requirePageSession } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export async function getCurrentUserForPage() {
  await requirePageSession();
  const profile = await apiGetSafe<CurrentUser | null>("/api/me", null);
  if (!profile.data) {
    redirect("/login");
  }
  return profile.data;
}

export async function ProtectedRoute({
  route,
  permission,
  children,
}: {
  route: string;
  permission?: PermissionKey;
  children: ReactNode | ((user: CurrentUser) => ReactNode);
}) {
  const user = await getCurrentUserForPage();
  if (!canAccessRoute(user, route) || (permission && !hasPermission(user, permission))) {
    redirect(`/403?next=${encodeURIComponent(defaultDashboardForRole(user.role))}`);
  }

  return typeof children === "function" ? children(user) : children;
}
