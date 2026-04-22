export function LockMessage() {
  return (
    <div
      role="alert"
      className="rounded-lg border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning shadow-[var(--shadow-card)]"
    >
      <span className="font-display font-semibold">Brackets are locked.</span>{" "}
      <span className="text-text-muted">
        Your bracket was not submitted.
      </span>
    </div>
  );
}
