"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
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
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);
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
      {/* Golden Boot */}
      <Card variant="flat" padding="md">
        <div className="mb-3">
          <h3 className="font-display text-base font-semibold text-text">
            Golden Boot — actual top scorer
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Enter after tournament finishes. Used as tiebreaker on the combined leaderboard.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="text"
            value={topScorer}
            onChange={(e) => setTopScorer(e.target.value)}
            placeholder="e.g. Kylian Mbappé"
            className="h-10 flex-1"
            aria-label="Top scorer"
          />
          <Button onClick={saveScorer} disabled={savingScorer}>
            {savingScorer ? "Saving..." : "Save"}
          </Button>
        </div>
      </Card>

      {/* Third-place advancers */}
      <Card variant="flat" padding="md">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-semibold text-text">
              Third-place advancers
            </h3>
            <p className="mt-0.5 text-xs text-text-muted">
              Select exactly 8 of 12. Required before auto-seeding the bracket.
            </p>
          </div>
          <Badge variant={advancers.size === 8 ? "success" : "default"}>
            {advancers.size}/8
          </Badge>
        </div>
        {!allGroupsHaveResults && (
          <div className="mb-3 rounded-lg border border-warning/30 bg-warning-bg p-3 text-xs text-warning">
            Some groups still need final positions entered.
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {groups.map((g) => {
            const selected = advancers.has(g.id);
            const disabled = !g.thirdPlaceTeam;
            return (
              <button
                key={g.id}
                onClick={() => toggleAdvancer(g.id)}
                disabled={disabled}
                aria-pressed={selected}
                className={cn(
                  "rounded-lg border p-2 text-left text-xs transition-colors",
                  selected
                    ? "border-accent bg-accent/15 text-accent-strong"
                    : disabled
                    ? "cursor-not-allowed border-border bg-surface-2 text-text-subtle"
                    : "border-border bg-surface text-text hover:bg-surface-2"
                )}
              >
                <div className="font-display font-semibold">Group {g.name}</div>
                <div className="mt-0.5 text-text-muted">
                  {g.thirdPlaceTeam ?? "—"}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            onClick={saveAdvancers}
            disabled={savingAdvancers || !allGroupsHaveResults}
          >
            {savingAdvancers ? "Saving..." : "Save advancers"}
          </Button>
        </div>
      </Card>

      {/* Auto seed */}
      <Card variant="flat" padding="md">
        <div className="mb-3">
          <h3 className="font-display text-base font-semibold text-text">
            Auto-seed Round of 32
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Generates 16 R32 matchups from group results + the 8 selected third-place advancers.
            Uses a deterministic pairing rule — you can manually override any matchup after seeding.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setSeedConfirmOpen(true)} disabled={seeding}>
            {seeding ? "Seeding..." : "Auto-seed R32"}
          </Button>
        </div>
      </Card>

      {message && (
        <p
          className={cn(
            "text-sm",
            message.kind === "error" ? "text-error" : "text-success"
          )}
        >
          {message.text}
        </p>
      )}

      <ConfirmDialog
        open={seedConfirmOpen}
        onOpenChange={setSeedConfirmOpen}
        title="Auto-seed the Round of 32?"
        description="This replaces any existing R32 matchups and clears all users' bracket picks on those matches. Group stage must be finalized first."
        confirmLabel="Seed bracket"
        destructive
        loading={seeding}
        onConfirm={seedBracket}
      />
    </div>
  );
}
