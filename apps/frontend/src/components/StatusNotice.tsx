interface StatusNoticeProps {
  errors?: Array<string | undefined>;
  message?: string;
}

export function StatusNotice({
  errors = [],
  message = "Some workspace data is temporarily unavailable.",
}: StatusNoticeProps) {
  const visibleErrors = errors.filter(Boolean);
  if (visibleErrors.length === 0) {
    return null;
  }

  return (
    <div className="notice warn-notice">
      {message}
      {visibleErrors.length === 1 ? ` ${visibleErrors[0]}` : ""}
    </div>
  );
}
