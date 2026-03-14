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
      <h3 className="text-base font-semibold text-slate-900 mb-3">Add Group</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Group name (e.g. A)"
          className="h-10"
        />
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
          />
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          type="submit"
          disabled={saving}
          className="bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300"
        >
          {saving ? "Saving..." : "Save Group"}
        </Button>
      </form>

      {existingGroups.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-base font-semibold text-slate-900">Existing Groups ({existingGroups.length}/12)</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {existingGroups.map((g) => (
              <div key={g.id} className="rounded border border-slate-200 p-3">
                <p className="font-medium text-slate-900 text-sm">Group {g.name}</p>
                <p className="text-xs text-slate-500 mt-1">{g.teams.join(", ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
