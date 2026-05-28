import { SignupForm } from "@/components/SignupForm";
import { requireAuthToken } from "@/lib/server-api";
import { redirect } from "next/navigation";

export default async function SignupPage() {
  if (await requireAuthToken()) {
    redirect("/setup");
  }

  return <SignupForm />;
}
