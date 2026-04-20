import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, picks, matches, results, tournamentConfig, groupPicks, groupTeams } from "@/db/schema";
import { asc } from "drizzle-orm";
import { buildLeaderboardEntries, getPointsPerRound } from "@/lib/scoring-engine";
import { buildCombinedLeaderboard } from "@/lib/group-scoring-engine";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { LockMessage } from "@/components/LockMessage";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ locked?: string }>;
}) {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;
  if (!username) redirect("/");

  const params = await searchParams;
  const isLocked = params.locked === "1";

  const [allUsers, allPicks, allMatches, allResults, config, allGroupPicks, allGroupTeams] = await Promise.all([
    db.select().from(users).all(),
    db.select().from(picks).all(),
    db.select().from(matches).orderBy(asc(matches.round), asc(matches.position)).all(),
    db.select().from(results).all(),
    db.select().from(tournamentConfig).get(),
    db.select().from(groupPicks).all(),
    db.select().from(groupTeams).all(),
  ]);

  const pointsPerRound = config
    ? getPointsPerRound(config)
    : { 1: 2, 2: 4, 3: 8, 4: 16, 5: 32 };

  const bracketEntries = buildLeaderboardEntries({
    users: allUsers,
    allPicks,
    results: allResults,
    matches: allMatches,
    pointsPerRound,
  });

  const groupResultsMap = new Map<number, { teamName: string; finalPosition: number }[]>();
  for (const gt of allGroupTeams) {
    if (gt.finalPosition != null) {
      if (!groupResultsMap.has(gt.groupId)) groupResultsMap.set(gt.groupId, []);
      groupResultsMap.get(gt.groupId)!.push({ teamName: gt.teamName, finalPosition: gt.finalPosition });
    }
  }
  const groupResults = Array.from(groupResultsMap.entries()).map(([groupId, teams]) => ({ groupId, teams }));

  const groupConfig = {
    pointsGroupPosition: config?.pointsGroupPosition ?? 2,
    pointsGroupPerfect: config?.pointsGroupPerfect ?? 5,
  };

  const userGroupPicks = allUsers.map((u) => ({
    userId: u.id,
    picks: allGroupPicks
      .filter((p) => p.userId === u.id)
      .map((p) => ({
        groupId: p.groupId,
        firstPlace: p.firstPlace,
        secondPlace: p.secondPlace,
        thirdPlace: p.thirdPlace,
        fourthPlace: p.fourthPlace,
      })),
  }));

  const finalMatch = allMatches.find((m) => m.round === 5 && m.position === 1);
  const finalResult = finalMatch ? allResults.find((r) => r.matchId === finalMatch.id) : null;
  const actualChampion = finalResult?.winner ?? null;

  const combinedEntries = buildCombinedLeaderboard({
    users: allUsers.map((u) => ({ id: u.id, username: u.username, topScorerPick: u.topScorerPick })),
    bracketEntries,
    groupPicks: userGroupPicks,
    groupResults,
    groupConfig,
    actualTopScorer: config?.actualTopScorer ?? null,
    actualChampion,
  });

  const bracketByUser = new Map(bracketEntries.map((e) => [e.userId, e]));
  const tableEntries = combinedEntries.map((entry) => {
    const bracket = bracketByUser.get(entry.userId);
    return {
      userId: entry.userId,
      username: entry.username,
      score: entry.combinedScore,
      maxPossible: (bracket?.maxPossible ?? 0) + entry.groupScore,
      championPick: bracket?.championPick ?? null,
      isChampionEliminated: bracket?.isChampionEliminated ?? false,
      isEliminated: bracket?.isEliminated ?? false,
      rank: entry.rank,
      groupScore: entry.groupScore,
      bracketScore: entry.bracketScore,
    };
  });

  return (
    <div className="px-4 py-6">
      <h1 className="font-display text-2xl font-bold mb-4 text-slate-900">Leaderboard</h1>
      {isLocked && (
        <div className="mb-4">
          <LockMessage />
        </div>
      )}
      <LeaderboardTable entries={tableEntries} currentUsername={username} />
    </div>
  );
}
