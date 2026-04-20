"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  setActualTopScorer,
  setThirdPlaceAdvancers,
  autoSeedR32,
} from "@/lib/actions/admin";

interface GroupWithThird {
  id: number;
  name: string;
  thirdPlaceTeam: string | null;
}

interface KnockoutSetupProps {
  groups: GroupWithThird[];
  initialAdvancers: number[];
  initialTopScorer: string | null;
  allGroupsHaveResults: boolean;
}

export function KnockoutSetup({
  groups,
  initialAdvancers,
  initialTopScorer,
  allGroupsHaveResults,
}: KnockoutSetupProps) {
  const router = useRouter();
  const [advancers, setAdvancers] = useState<Set<number>>(new Set(initialAdvancers));
  const [topScorer, setTopScorer] = useState(initialTopScorer ?? "");
  const [savingAdvancers, setSavingAdvancers] = useState(false);
  const [savingScorer, setSavingScorer] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  function toggleAdvancer(groupId: number) {
    const next = new Set(advancers);
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    setAdvancers(next);
  }

  async function saveAdvancers() {
    if (advancers.size !== 8) {
      setMessage({ kind: "error", text: `Select exactly 8 groups (currently ${advancers.size})` });
      return;
    }
    setSavingAdvancers(true);
    setMessage(null);
    const result = await setThirdPlaceAdvancers(Array.from(advancers));
    if (result.success) {
      setMessage({ kind: "success", text: "Third-place advancers saved" });
      router.refresh();
    } else {
      setMessage({ kind: "error", text: result.error });
    }
    setSavingAdvancers(false);
  }

  async function saveScorer() {
    setSavingScorer(true);
    setMessage(null);
    const result = await setActualTopScorer(topScorer.trim() || null);
    if (result.success) {
      setMessage({ kind: "success", text: "Golden Boot saved" });
    } else {
      setMessage({ kind: "error", text: result.error });
    }
    setSavingScorer(false);
  }

  async function seedBracket() {
    if (!confirm("Auto-seed the Round of 32? This replaces any existing R32 matchups and clears bracket picks on them.")) {
      return;
    }
    setSeeding(true);
    setMessage(null);
    const result = await autoSeedR32();
    if (result.success) {
      setMessage({ kind: "success", text: `Seeded ${result.data.created} R32 matchups. Review and override as needed.` });
      router.refresh();
    } else {
      setMessage({ kind: "error", text: result.error });
    }
    setSeeding(false);
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-base font-semibold text-slate-900 mb-2">Golden Boot — Actual Top Scorer</h3>
        <p className="text-xs text-slate-500 mb-2">
          Enter after tournament finishes. Used as tiebreaker on the combined leaderboard.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={topScorer}
            onChange={(e) => setTopScorer(e.target.value)}
            placeholder="e.g. Kylian Mbappé"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
          />
          <Button
            onClick={saveScorer}
            disabled={savingScorer}
            className="bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300"
          >
            {savingScorer ? "Saving..." : "Save"}
          </Button>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-slate-900 mb-2">
          Third-Place Advancers — Select 8 of 12
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Only available once all 12 groups have final results. Required before auto-seeding.
        </p>
        {!allGroupsHaveResults && (
          <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            Some groups still need final positions entered.
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {groups.map((g) => {
            const selected = advancers.has(g.id);
            const disabled = !g.thirdPlaceTeam;
            return (
              <button
                key={g.id}
                onClick={() => toggleAdvancer(g.id)}
                disabled={disabled}
                className={`rounded-lg border p-2 text-left text-xs transition-colors ${
                  selected
                    ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#8B7A2E]"
                    : disabled
                    ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="font-semibold">Group {g.name}</div>
                <div className="text-slate-500">{g.thirdPlaceTeam ?? "—"}</div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">{advancers.size} of 8 selected</p>
          <Button
            onClick={saveAdvancers}
            disabled={savingAdvancers || !allGroupsHaveResults}
            className="bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300"
          >
            {savingAdvancers ? "Saving..." : "Save Advancers"}
          </Button>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-slate-900 mb-2">Auto-Seed Round of 32</h3>
        <p className="text-xs text-slate-500 mb-3">
          Generates 16 R32 matchups from group results + the 8 selected third-place advancers.
          Uses a deterministic pairing rule — you can manually override any matchup after seeding.
        </p>
        <Button
          onClick={seedBracket}
          disabled={seeding}
          className="bg-[#0F2E23] text-white hover:bg-[#1A4A38] disabled:bg-slate-300"
        >
          {seeding ? "Seeding..." : "Auto-Seed R32"}
        </Button>
      </section>

      {message && (
        <p
          className={`text-sm ${
            message.kind === "error" ? "text-red-600" : "text-emerald-700"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
