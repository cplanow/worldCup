"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setupGroup } from "@/lib/actions/admin";

interface ExistingGroup {
  id: number;
  name: string;
  teams: string[];
}

interface GroupSetupProps {
  existingGroups: ExistingGroup[];
}

export function GroupSetup({ existingGroups }: GroupSetupProps) {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [teams, setTeams] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const result = await setupGroup({
      name: groupName.trim(),
      teams: teams.map((t) => t.trim()),
    });

    if (result.success) {
      setGroupName("");
      setTeams(["", "", "", ""]);
      router.refresh();
    } else {
      setError(result.error);
    }
    setSaving(false);
  }

  return (
    <div>
      <h3 className="mb-3 font-display text-base font-semibold text-text">
        Add group
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor="admin-group-name"
            className="block text-xs font-medium text-text-muted"
          >
            Group name
          </label>
          <Input
            id="admin-group-name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. A"
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-text-muted">
            Teams (4 required)
          </span>
          <div className="grid gap-2 sm:grid-cols-2">
            {teams.map((team, i) => (
              <Input
                key={i}
                value={team}
                onChange={(e) => {
                  const newTeams = [...teams];
                  newTeams[i] = e.target.value;
                  setTeams(newTeams);
                }}
                placeholder={`Team ${i + 1}`}
                className="h-10"
                aria-label={`Team ${i + 1}`}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save group"}
          </Button>
        </div>
      </form>

      {existingGroups.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="font-display text-base font-semibold text-text">
            Existing groups ({existingGroups.length}/12)
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {existingGroups.map((g) => (
              <div
                key={g.id}
                className="rounded-lg border border-border bg-surface-2 p-3"
              >
                <p className="font-display text-sm font-semibold text-text">
                  Group {g.name}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {g.teams.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
