"use client";

import { AlertTriangle } from "lucide-react";
import { ReactNode } from "react";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  danger = false,
  disabled = false,
  children,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <span className={`confirm-dialog-icon ${danger ? "danger" : ""}`}>
          <AlertTriangle size={22} />
        </span>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{description}</p>
        {children ? <div className="confirm-dialog-body">{children}</div> : null}
        <div className="confirm-dialog-actions">
          <button className="button secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`button ${danger ? "danger" : ""}`}
            disabled={disabled}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
