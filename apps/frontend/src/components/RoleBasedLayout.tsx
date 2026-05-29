import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { PermissionKey } from "@/lib/authz";
import { ReactNode } from "react";

export async function RoleBasedLayout({
  route,
  permission,
  crumbs,
  children,
}: {
  route: string;
  permission?: PermissionKey;
  crumbs?: Array<{ label: string; href?: string }>;
  children: ReactNode;
}) {
  return (
    <ProtectedRoute route={route} permission={permission}>
      {(user) => (
        <div className="shell">
          <RoleBasedSidebar user={user} />
          <main className="main">
            <ImpersonationBanner />
            {crumbs ? <Breadcrumbs items={crumbs} /> : null}
            {children}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}

export function ImpersonationBanner() {
  return null;
}
