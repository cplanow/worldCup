"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toggleGroupStageLock } from "@/lib/actions/admin";

interface GroupStageLockToggleProps {
  initialLocked: boolean;
}

export function GroupStageLockToggle({ initialLocked }: GroupStageLockToggleProps) {
  const router = useRouter();
  const [locked, setLocked] = useState(initialLocked);
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    setToggling(true);
    const result = await toggleGroupStageLock(!locked);
    if (result.success) {
      setLocked(result.data.groupStageLocked);
      router.refresh();
    }
    setToggling(false);
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
      <div>
        <p className="font-medium text-slate-900">Group Stage Picks</p>
        <p className="text-sm text-slate-500">
          {locked ? "Locked — users cannot modify group picks" : "Open — users can submit group picks"}
        </p>
      </div>
      <Button
        onClick={handleToggle}
        disabled={toggling}
        variant={locked ? "outline" : "default"}
        className={locked ? "" : "bg-red-600 hover:bg-red-700 text-white"}
      >
        {toggling ? "..." : locked ? "Unlock" : "Lock"}
      </Button>
    </div>
  );
}
