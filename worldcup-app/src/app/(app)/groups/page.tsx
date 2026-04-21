import { db } from "@/db";
import { groups, groupTeams, groupPicks, tournamentConfig } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { GroupPicksView } from "@/components/groups/GroupPicksView";
import { requireSessionOrRedirect } from "@/lib/session";

export default async function GroupsPage() {
  const user = await requireSessionOrRedirect();

  const [allGroups, allTeams, userPicks, config] = await Promise.all([
    db.select().from(groups).orderBy(asc(groups.name)).all(),
    db.select().from(groupTeams).all(),
    db.select().from(groupPicks).where(eq(groupPicks.userId, user.id)).all(),
    db.select().from(tournamentConfig).get(),
  ]);

  const groupsWithTeams = allGroups.map((g) => ({
    id: g.id,
    name: g.name,
    teams: allTeams.filter((t) => t.groupId === g.id).map((t) => t.teamName),
  }));

  const existingPicks = userPicks.map((p) => ({
    groupId: p.groupId,
    firstPlace: p.firstPlace,
    secondPlace: p.secondPlace,
    thirdPlace: p.thirdPlace,
    fourthPlace: p.fourthPlace,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="font-display mb-4 text-2xl font-bold text-slate-900">Group Stage Picks</h1>
      {allGroups.length === 0 ? (
        <p className="text-slate-500">Groups haven&apos;t been set up yet. Check back soon!</p>
      ) : (
        <GroupPicksView
          groups={groupsWithTeams}
          existingPicks={existingPicks}
          initialTopScorer={user.topScorerPick}
          isSubmitted={user.groupPicksSubmitted}
          isLocked={config?.groupStageLocked ?? false}
        />
      )}
    </div>
  );
}
