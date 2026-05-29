export function StatusBadge({
  status,
  label,
}: {
  status?: "good" | "warn" | "danger" | "neutral" | boolean | string | null;
  label?: string;
}) {
  const tone = status === true || status === "good" || status === "active" || status === "verified" || status === "connected"
    ? "good"
    : status === "danger" || status === "failed" || status === "inactive" || status === "disabled"
      ? "danger"
      : status === "neutral"
        ? "neutral"
        : "warn";

  return <span className={`badge ${tone}`}>{label ?? readableStatus(status)}</span>;
}

export function HealthBadge({
  label,
  connected,
}: {
  label: string;
  connected?: boolean | null;
}) {
  return (
    <span className={`health-badge ${connected ? "good" : "warn"}`}>
      <i />
      {label}: {connected ? "OK" : "Needs attention"}
    </span>
  );
}

function readableStatus(status: unknown) {
  if (status === true) return "Verified";
  if (status === false) return "Pending";
  if (!status) return "Pending";
  return String(status)
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
