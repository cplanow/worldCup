"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toggleLock } from "@/lib/actions/admin";

export function BracketLockToggle({
  initialLocked,
}: {
  initialLocked: boolean;
}) {
  const [isLocked, setIsLocked] = useState(initialLocked);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(checked: boolean) {
    setIsPending(true);
    setError(null);
    setIsLocked(checked);

    const result = await toggleLock(checked);

    if (!result.success) {
      setIsLocked(!checked);
      setError(result.error);
    }
    setIsPending(false);
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-2 p-4">
      <div className="min-w-0">
        <p className="font-semibold text-text">Bracket picks</p>
        <p className="mt-0.5 text-sm text-text-muted">
          {isLocked
            ? "Locked — no new bracket picks allowed"
            : "Open — users can submit bracket picks"}
        </p>
        {error && (
          <p className="mt-2 text-sm text-error">{error}</p>
        )}
      </div>
      <Switch
        checked={isLocked}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label="Toggle bracket lock"
      />
    </div>
  );
}
