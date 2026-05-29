import { Inbox, type LucideIcon } from "lucide-react";
import Link from "next/link";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="empty-state">
      <Icon size={28} />
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? (
        <Link className="button secondary" href={action.href}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
