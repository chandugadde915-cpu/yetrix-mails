export function LoadingState({ label = "Loading workspace data" }: { label?: string }) {
  return (
    <div className="loading-state" aria-live="polite">
      <span />
      {label}
    </div>
  );
}
