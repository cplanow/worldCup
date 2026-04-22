"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { toggleGroupStageLock } from "@/lib/actions/admin";

interface GroupStageLockToggleProps {
  initialLocked: boolean;
}

export function GroupStageLockToggle({ initialLocked }: GroupStageLockToggleProps) {
  const router = useRouter();
  const [locked, setLocked] = useState(initialLocked);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(checked: boolean) {
    setToggling(true);
    setError(null);
    setLocked(checked);
    const result = await toggleGroupStageLock(checked);
    if (result.success) {
      setLocked(result.data.groupStageLocked);
      router.refresh();
    } else {
      setLocked(!checked);
      setError(result.error);
    }
    setToggling(false);
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-2 p-4">
      <div className="min-w-0">
        <p className="font-semibold text-text">Group stage picks</p>
        <p className="mt-0.5 text-sm text-text-muted">
          {locked
            ? "Locked — users cannot modify group picks"
            : "Open — users can submit group picks"}
        </p>
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
      </div>
      <Switch
        checked={locked}
        onCheckedChange={handleToggle}
        disabled={toggling}
        aria-label="Toggle group stage lock"
      />
    </div>
  );
}
