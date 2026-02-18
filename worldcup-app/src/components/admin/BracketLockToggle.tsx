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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        Bracket Entry Control
      </h2>
      <div className="flex items-center gap-3">
        <Switch
          checked={isLocked}
          onCheckedChange={handleToggle}
          disabled={isPending}
          aria-label="Toggle bracket lock"
        />
        <span
          className={`text-sm ${
            isLocked
              ? "font-medium text-red-600"
              : "text-slate-500"
          }`}
        >
          {isLocked
            ? "Brackets are locked — no new picks allowed"
            : "Brackets are open for entry"}
        </span>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
