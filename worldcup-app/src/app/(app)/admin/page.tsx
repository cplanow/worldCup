import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMatches, getTournamentConfig, getResults } from "@/lib/actions/admin";
import { MatchupSetup } from "@/components/admin/MatchupSetup";
import { BracketLockToggle } from "@/components/admin/BracketLockToggle";
import { ResultsManager } from "@/components/admin/ResultsManager";
import type { Match, Result } from "@/types";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;

  if (
    !username ||
    username.toLowerCase() !== process.env.ADMIN_USERNAME?.toLowerCase()
  ) {
    redirect("/leaderboard");
  }

  const [matchResult, config, resultsResult] = await Promise.all([
    getMatches(),
    getTournamentConfig(),
    getResults(),
  ]);

  const allMatches: Match[] = matchResult.success ? matchResult.data : [];
  const allResults: Result[] = resultsResult.success ? resultsResult.data : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        Tournament Setup
      </h1>
      <BracketLockToggle initialLocked={config.isLocked} />
      <div className="mt-6">
        <MatchupSetup existingMatches={allMatches} />
      </div>
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Match Results</h2>
        <ResultsManager matches={allMatches} initialResults={allResults} />
      </div>
    </div>
  );
}
