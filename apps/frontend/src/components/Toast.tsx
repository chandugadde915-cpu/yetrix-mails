"use client";

export function ToastMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="notice toast-message">{message}</div>;
}
