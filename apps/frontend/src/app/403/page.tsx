import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params?.next ?? "/login";

  return (
    <main className="error-page branded-error">
      <div className="auth-mark">
        <ShieldAlert size={24} />
      </div>
      <h1>Access denied</h1>
      <p>Your account does not have permission to open this workspace area.</p>
      <div className="page-actions center">
        <Link className="button" href={next}>
          Go back
        </Link>
        <Link className="button secondary" href="/login">
          Switch account
        </Link>
      </div>
    </main>
  );
}
