import { type LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
}

export function MetricCard({ icon: Icon, label, value }: MetricCardProps) {
  return (
    <div className="panel">
      <div className="metric-row">
        <Icon size={20} />
        <div className="metric">{label}</div>
      </div>
      <div className="value">{value}</div>
    </div>
  );
}
