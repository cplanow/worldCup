import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { requireSessionOrRedirect } from "@/lib/session";

export const metadata = {
  title: "Rules — worldCup",
};

type MilestoneStatus = "done" | "current" | "upcoming";

interface Milestone {
  date: string;
  event: string;
  action: string;
  status: MilestoneStatus;
}

// Tournament runs June 11 – July 19, 2026. Today's date drives the status.
const KICKOFF = new Date("2026-06-11");
const GROUP_STAGE_END = new Date("2026-06-27");
const BRACKET_OPEN = new Date("2026-06-28");
const R32_END = new Date("2026-07-04");
const FINAL = new Date("2026-07-19");

function statusFor(date: Date, now: Date): MilestoneStatus {
  const DAY = 24 * 60 * 60 * 1000;
  if (now.getTime() > date.getTime() + DAY) return "done";
  if (now.getTime() >= date.getTime() - DAY) return "current";
  return "upcoming";
}

export default async function RulesPage() {
  await requireSessionOrRedirect();

  const now = new Date();
  const milestones: Milestone[] = [
    {
      date: "Before June 11",
      event: "Group-stage lock",
      action: "Submit your 12 group rankings + Golden Boot pick",
      status: statusFor(KICKOFF, now) === "upcoming" ? "current" : "done",
    },
    {
      date: "June 11",
      event: "Tournament kicks off",
      action: "—",
      status: statusFor(KICKOFF, now),
    },
    {
      date: "~June 26",
      event: "Group stage ends",
      action: "Admin enters results + picks advancing 3rd-placers",
      status: statusFor(GROUP_STAGE_END, now),
    },
    {
      date: "~June 28",
      event: "Bracket opens",
      action: "Fill in R32 → Final and submit",
      status: statusFor(BRACKET_OPEN, now),
    },
    {
      date: "Jun 28 – Jul 3",
      event: "Round of 32",
      action: "Picks lock on submit; admin enters results",
      status: statusFor(R32_END, now),
    },
    {
      date: "July 19",
      event: "Final at MetLife",
      action: "Leaderboard freezes",
      status: statusFor(FINAL, now),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Hero */}
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
          World Cup 2026 · Private Pool
        </p>
        <h1 className="mt-2 text-display-md text-text">How this pool works</h1>
        <p className="mt-3 max-w-2xl text-sm text-text-muted sm:text-base">
          Two phases: rank every group before the tournament starts, then fill
          out the knockout bracket once the group results are in. Combine both
          for up to{" "}
          <span className="font-display font-bold tabular-nums text-text">
            316 points
          </span>{" "}
          of prediction glory.
        </p>
      </div>

      {/* Timeline */}
      <section id="timeline" className="mb-10">
        <h2 className="mb-4 text-display-sm text-text">Timeline</h2>
        <Card padding="md">
          <CardContent>
            <ol className="relative ml-3 border-l-2 border-border">
              {milestones.map((m, i) => (
                <li key={i} className="relative ml-6 pb-6 last:pb-0">
                  <span
                    className="absolute -left-[34px] flex h-6 w-6 items-center justify-center rounded-full bg-surface"
                    aria-hidden="true"
                  >
                    {m.status === "done" ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : m.status === "current" ? (
                      <Clock className="h-5 w-5 text-accent" />
                    ) : (
                      <Circle className="h-5 w-5 text-text-subtle" />
                    )}
                  </span>
                  <span className="sr-only">
                    {m.status === "done"
                      ? "Completed: "
                      : m.status === "current"
                      ? "Current: "
                      : "Upcoming: "}
                  </span>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-display text-sm font-semibold tabular-nums text-text">
                      {m.date}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        m.status === "current" ? "text-accent-strong" : "text-text"
                      )}
                    >
                      {m.event}
                    </span>
                  </div>
                  {m.action !== "—" && (
                    <p className="mt-1 text-xs text-text-muted">{m.action}</p>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      {/* Phase 1 — Group Stage */}
      <section id="group-stage" className="mb-10">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-display-sm text-text">Phase 1 — Group Stage</h2>
          <Badge variant="accent">156 pts max</Badge>
        </div>
        <Card padding="lg">
          <CardContent>
            <p className="text-sm text-text">
              Rank all 4 teams 1st through 4th in each of the 12 groups (A–L).
              Your ranking is compared to the real finishing order after group
              play.
            </p>

            <div className="my-5 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">Group stage scoring breakdown</caption>
                <thead className="bg-surface-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">Event</th>
                    <th className="px-4 py-2 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-2.5 text-text">
                      Team placed in correct position
                    </td>
                    <td className="px-4 py-2.5 text-right font-display font-bold tabular-nums text-text">
                      2 ea
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-text">
                      Perfect group bonus (all 4 exactly right)
                    </td>
                    <td className="px-4 py-2.5 text-right font-display font-bold tabular-nums text-text">
                      +5
                    </td>
                  </tr>
                  <tr className="bg-surface-2">
                    <td className="px-4 py-2.5 font-semibold text-text">
                      Max per group
                    </td>
                    <td className="px-4 py-2.5 text-right font-display font-bold tabular-nums text-accent-strong">
                      13
                    </td>
                  </tr>
                  <tr className="bg-surface-2">
                    <td className="px-4 py-2.5 font-semibold text-text">
                      Max across 12 groups
                    </td>
                    <td className="px-4 py-2.5 text-right font-display text-lg font-bold tabular-nums text-accent-strong">
                      156
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm text-text-muted">
              <span className="font-semibold text-text">Golden Boot.</span>{" "}
              You also pick who you think will lead the tournament in goals.
              It&apos;s required before you can submit, and it breaks ties at
              the end.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Phase 2 — Knockout Bracket */}
      <section id="bracket" className="mb-10">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-display-sm text-text">Phase 2 — Knockout Bracket</h2>
          <Badge variant="accent">160 pts max</Badge>
        </div>
        <Card padding="lg">
          <CardContent>
            <p className="text-sm text-text">
              After the group stage ends, fill in the winner of every knockout
              match. Points{" "}
              <span className="font-semibold">double each round</span>, so a
              correct Final pick is worth{" "}
              <span className="font-display font-bold tabular-nums">16×</span>{" "}
              a correct R32 pick. Nobody is out of it until the last match.
            </p>

            <div className="my-5 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">Bracket scoring breakdown per round</caption>
                <thead className="bg-surface-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">Round</th>
                    <th className="px-4 py-2 text-right">Games</th>
                    <th className="px-4 py-2 text-right">Each</th>
                    <th className="px-4 py-2 text-right">Max</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-body tabular-nums">
                  <tr><td className="px-4 py-2.5">Round of 32</td><td className="px-4 py-2.5 text-right">16</td><td className="px-4 py-2.5 text-right">2</td><td className="px-4 py-2.5 text-right font-display font-semibold">32</td></tr>
                  <tr><td className="px-4 py-2.5">Round of 16</td><td className="px-4 py-2.5 text-right">8</td><td className="px-4 py-2.5 text-right">4</td><td className="px-4 py-2.5 text-right font-display font-semibold">32</td></tr>
                  <tr><td className="px-4 py-2.5">Quarterfinals</td><td className="px-4 py-2.5 text-right">4</td><td className="px-4 py-2.5 text-right">8</td><td className="px-4 py-2.5 text-right font-display font-semibold">32</td></tr>
                  <tr><td className="px-4 py-2.5">Semifinals</td><td className="px-4 py-2.5 text-right">2</td><td className="px-4 py-2.5 text-right">16</td><td className="px-4 py-2.5 text-right font-display font-semibold">32</td></tr>
                  <tr><td className="px-4 py-2.5">Final</td><td className="px-4 py-2.5 text-right">1</td><td className="px-4 py-2.5 text-right">32</td><td className="px-4 py-2.5 text-right font-display font-semibold">32</td></tr>
                  <tr className="bg-surface-2">
                    <td className="px-4 py-2.5 font-semibold">Total</td>
                    <td className="px-4 py-2.5 text-right font-semibold">31</td>
                    <td className="px-4 py-2.5 text-right text-text-muted">—</td>
                    <td className="px-4 py-2.5 text-right font-display text-lg font-bold text-accent-strong">160</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm text-text-muted">
              A pick you made in an earlier round auto-fills later rounds when
              that team advances — if a team gets knocked out, all your later
              picks for that team clear automatically.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Combined + tiebreakers */}
      <section id="tiebreakers" className="mb-10">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-display-sm text-text">Combined leaderboard</h2>
          <Badge variant="accent">316 pts max</Badge>
        </div>
        <Card padding="lg">
          <CardContent>
            <p className="text-sm text-text">
              Your total is simply{" "}
              <span className="font-semibold">Group + Bracket</span>. If
              anyone&apos;s tied at the end, we apply these tiebreakers in
              order:
            </p>
            <ol className="mt-4 space-y-2 text-sm">
              <li className="flex gap-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-xs font-bold text-accent-strong">
                  1
                </span>
                <span className="text-text">
                  <span className="font-semibold">Combined score.</span>{" "}
                  Highest total wins.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-xs font-bold text-accent-strong">
                  2
                </span>
                <span className="text-text">
                  <span className="font-semibold">Golden Boot.</span> Correct
                  top-scorer pick wins over incorrect.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-xs font-bold text-accent-strong">
                  3
                </span>
                <span className="text-text">
                  <span className="font-semibold">Champion pick.</span>{" "}
                  Correct Final winner wins over incorrect.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-xs font-bold text-accent-strong">
                  4
                </span>
                <span className="text-text">
                  <span className="font-semibold">Username alphabetical.</span>{" "}
                  The rare-but-necessary last resort.
                </span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </section>

      {/* Fine print */}
      <section id="fine-print" className="mb-10">
        <h2 className="mb-4 text-display-sm text-text">Fine print</h2>
        <Card padding="lg" variant="flat">
          <CardContent>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-text">Locking</dt>
                <dd className="mt-1 text-text-muted">
                  Once you hit Submit for group picks or the bracket, your picks
                  are locked forever. No edits, no resets. The admin can&apos;t
                  edit your picks either.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-text">Changes before submit</dt>
                <dd className="mt-1 text-text-muted">
                  Edit freely up until you hit Submit or the admin locks the
                  round. The Saved indicator on each card shows what&apos;s
                  stored on the server.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-text">Account recovery</dt>
                <dd className="mt-1 text-text-muted">
                  Forgot your password? Ask the admin for a reset link. Links
                  expire in 1 hour.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-text">The admin</dt>
                <dd className="mt-1 text-text-muted">
                  The admin enters results and manages the bracket setup. The
                  admin&apos;s picks compete alongside everyone else&apos;s —
                  it&apos;s a fair game.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-text">No money</dt>
                <dd className="mt-1 text-text-muted">
                  This pool is for pride and leaderboard glory only.
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
