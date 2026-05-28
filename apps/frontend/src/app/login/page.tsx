import { LoginForm } from "@/components/LoginForm";
import { requireAuthToken } from "@/lib/server-api";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  if (await requireAuthToken()) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
