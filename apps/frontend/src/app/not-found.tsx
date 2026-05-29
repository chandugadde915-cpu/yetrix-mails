import { Home, Mail } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="loading-page branded-error-page">
      <div className="loading-box error-box">
        <span className="auth-mark">
          <Mail size={22} />
        </span>
        <strong>Page not found</strong>
        <span>The Yetrix page you opened does not exist or has moved.</span>
        <Link className="button" href="/dashboard">
          <Home size={18} />
          Back to dashboard
        </Link>
        <Link className="button secondary" href="/">
          Yetrix home
        </Link>
      </div>
    </main>
  );
}
