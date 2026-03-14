import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, groups, groupTeams, groupPicks, tournamentConfig } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { GroupPicksView } from "@/components/groups/GroupPicksView";

export default async function GroupsPage() {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;
  if (!username) redirect("/");

  const user = await db.select().from(users).where(eq(users.username, username)).get();
  if (!user) redirect("/");

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
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Group Stage Picks</h1>
      {allGroups.length === 0 ? (
        <p className="text-slate-500">Groups haven&apos;t been set up yet. Check back soon!</p>
      ) : (
        <GroupPicksView
          userId={user.id}
          groups={groupsWithTeams}
          existingPicks={existingPicks}
          isSubmitted={user.groupPicksSubmitted}
          isLocked={config?.groupStageLocked ?? false}
        />
      )}
    </div>
  );
}
