"use client";

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
        <span>{error.message}</span>
        <button className="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
