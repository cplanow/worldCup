"use client";

interface AuthErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

/**
 * Dismissible error banner for auth forms on the gradient.
 * Uses role="alert" so screen readers announce; semantic error tokens.
 */
export function AuthErrorBanner({ message, onDismiss }: AuthErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-lg border border-error/40 bg-error-bg/20 px-3 py-2 text-sm text-white animate-fade-in"
    >
      <span className="text-error">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="shrink-0 rounded text-white/60 transition-colors hover:text-white focus-visible:text-white"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}
