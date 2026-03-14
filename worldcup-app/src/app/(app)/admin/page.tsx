import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMatches, getTournamentConfig, getResults } from "@/lib/actions/admin";
import { MatchupSetup } from "@/components/admin/MatchupSetup";
import { BracketLockToggle } from "@/components/admin/BracketLockToggle";
import { ResultsManager } from "@/components/admin/ResultsManager";
import { GroupSetup } from "@/components/admin/GroupSetup";
import { GroupResultsEntry } from "@/components/admin/GroupResultsEntry";
import { GroupStageLockToggle } from "@/components/admin/GroupStageLockToggle";
import { db } from "@/db";
import { groups, groupTeams } from "@/db/schema";
import { asc } from "drizzle-orm";
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

  const [matchResult, config, resultsResult, allGroups, allGroupTeams] = await Promise.all([
    getMatches(),
    getTournamentConfig(),
    getResults(),
    db.select().from(groups).orderBy(asc(groups.name)).all(),
    db.select().from(groupTeams).all(),
  ]);

  const allMatches: Match[] = matchResult.success ? matchResult.data : [];
  const allResults: Result[] = resultsResult.success ? resultsResult.data : [];

  const groupsWithTeams = allGroups.map((g) => ({
    id: g.id,
    name: g.name,
    teams: allGroupTeams.filter((t) => t.groupId === g.id).map((t) => t.teamName),
  }));

  const groupsForResults = allGroups.map((g) => ({
    id: g.id,
    name: g.name,
    teams: allGroupTeams
      .filter((t) => t.groupId === g.id)
      .map((t) => ({ teamName: t.teamName, finalPosition: t.finalPosition })),
  }));

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
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Group Stage</h2>
        <GroupStageLockToggle initialLocked={config.groupStageLocked} />
        <div className="mt-4">
          <GroupSetup existingGroups={groupsWithTeams} />
        </div>
        {allGroups.length > 0 && (
          <div className="mt-6">
            <GroupResultsEntry groups={groupsForResults} />
          </div>
        )}
      </div>
    </div>
  );
}
