import { requirePageSession } from "@/lib/server-api";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  await requirePageSession();
  redirect("/dashboard");
}
