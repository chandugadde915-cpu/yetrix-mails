"use client";

import { RefreshCw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="loading-page">
      <div className="loading-box error-box">
        <strong>Could not load this page</strong>
        <span>{error.message || "The workspace could not be loaded right now."}</span>
        {error.digest ? <span className="mono">Digest {error.digest}</span> : null}
        <button className="button" type="button" onClick={reset}>
          <RefreshCw size={18} />
          Try again
        </button>
      </div>
    </main>
  );
}
