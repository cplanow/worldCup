import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, picks, matches, results } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { BracketView } from "@/components/bracket/BracketView";
import { getTournamentConfig } from "@/lib/actions/admin";
import { calculateScore, maxPossiblePoints, getPointsPerRound } from "@/lib/scoring-engine";

export default async function UserBracketPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);

  const cookieStore = await cookies();
  const currentUsername = cookieStore.get("username")?.value;
  if (!currentUsername) redirect("/");

  // If viewing own bracket, redirect to /bracket
  if (decodedUsername === currentUsername) {
    redirect("/bracket");
  }

  // Fetch target user
  const targetUser = await db
    .select()
    .from(users)
    .where(eq(users.username, decodedUsername))
    .get();

  if (!targetUser) {
    redirect("/leaderboard");
  }

  if (!targetUser.bracketSubmitted) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-4 text-slate-900">
          {targetUser.username}&apos;s Bracket
        </h1>
        <p className="text-slate-500">This bracket has not been submitted yet.</p>
      </div>
    );
  }

  const [allMatches, userPicks, allResults, tournamentConfig] = await Promise.all([
    db.select().from(matches).orderBy(asc(matches.round), asc(matches.position)).all(),
    db.select().from(picks).where(eq(picks.userId, targetUser.id)).all(),
    db.select().from(results).all(),
    getTournamentConfig(),
  ]);

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
      <h1 className="text-2xl font-bold mb-4 text-slate-900">
        {targetUser.username}&apos;s Bracket
      </h1>
      <BracketView
        matches={allMatches}
        picks={userPicks}
        results={allResults}
        isReadOnly={true}
        userId={targetUser.id}
        score={score}
        maxPossible={maxPossible}
      />
    </div>
  );
}
