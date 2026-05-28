import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
  compact?: boolean;
}

export function PageHeader({ title, description, actions, compact = false }: PageHeaderProps) {
  return (
    <div className={`topbar${compact ? " compact" : ""}`}>
      <div className="title">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}
