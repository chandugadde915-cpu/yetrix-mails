import { defaultDashboardForRole } from "@/lib/authz";
import { apiGetSafe, requirePageSession } from "@/lib/server-api";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardRedirectPage() {
  await requirePageSession();
  const profile = await apiGetSafe<{ role?: string | null } | null>("/api/me", null);
  redirect(defaultDashboardForRole(profile.data?.role));
}
