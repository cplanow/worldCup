import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, matches, picks, results } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { BracketView } from "@/components/bracket/BracketView";
import { getTournamentConfig } from "@/lib/actions/admin";
import { calculateScore, maxPossiblePoints, getPointsPerRound } from "@/lib/scoring-engine";

export default async function BracketPage() {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;

  if (!username) redirect("/");

  const user = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .get();

  if (!user) redirect("/");

  const [allMatches, userPicks, tournamentConfig, allResults] = await Promise.all([
    db
      .select()
      .from(matches)
      .orderBy(asc(matches.round), asc(matches.position))
      .all(),
    db
      .select()
      .from(picks)
      .where(eq(picks.userId, user.id))
      .all(),
    getTournamentConfig(),
    db.select().from(results).all(),
  ]);

  const isReadOnly = user.bracketSubmitted || tournamentConfig.isLocked;

  let score: number | undefined;
  let maxPossible: number | undefined;
  if (allResults.length > 0) {
    const pointsPerRound = getPointsPerRound(tournamentConfig);
    score = calculateScore({ picks: userPicks, results: allResults, matches: allMatches, pointsPerRound });
    maxPossible = maxPossiblePoints({
      picks: userPicks,
      results: allResults,
      matches: allMatches,
      pointsPerRound,
      currentScore: score,
    });
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 text-slate-900">My Bracket</h1>
      <BracketView
        matches={allMatches}
        picks={userPicks}
        isReadOnly={isReadOnly}
        userId={user.id}
        results={allResults}
        score={score}
        maxPossible={maxPossible}
      />
    </div>
  );
}
