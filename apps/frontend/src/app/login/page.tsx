import { LoginForm } from "@/components/LoginForm";
import { hasWorkspaceSession } from "@/lib/server-api";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  if (await hasWorkspaceSession()) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
