import { SignupForm } from "@/components/SignupForm";
import { hasWorkspaceSession } from "@/lib/server-api";
import { redirect } from "next/navigation";

export default async function SignupPage() {
  if (await hasWorkspaceSession()) {
    redirect("/setup");
  }

  return <SignupForm />;
}
