import { redirect } from "next/navigation";
import { getMatches, getTournamentConfig, getResults, getThirdPlaceAdvancers } from "@/lib/actions/admin";
import { requireSessionOrRedirect, isAdminUsername } from "@/lib/session";
import { MatchupSetup } from "@/components/admin/MatchupSetup";
import { BracketLockToggle } from "@/components/admin/BracketLockToggle";
import { ResultsManager } from "@/components/admin/ResultsManager";
import { GroupSetup } from "@/components/admin/GroupSetup";
import { GroupResultsEntry } from "@/components/admin/GroupResultsEntry";
import { GroupStageLockToggle } from "@/components/admin/GroupStageLockToggle";
import { KnockoutSetup } from "@/components/admin/KnockoutSetup";
import { AdminUserList } from "@/components/admin/AdminUserList";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { db } from "@/db";
import { groups, groupTeams, users } from "@/db/schema";
import { asc } from "drizzle-orm";
import type { Match, Result } from "@/types";

export default async function AdminPage() {
  const user = await requireSessionOrRedirect();

  if (!isAdminUsername(user.username)) {
    redirect("/leaderboard");
  }

  const [matchResult, config, resultsResult, allGroups, allGroupTeams, advancersResult, allUsers] = await Promise.all([
    getMatches(),
    getTournamentConfig(),
    getResults(),
    db.select().from(groups).orderBy(asc(groups.name)).all(),
    db.select().from(groupTeams).all(),
    getThirdPlaceAdvancers(),
    db.select({ id: users.id, username: users.username }).from(users).orderBy(asc(users.username)).all(),
  ]);

  // Base URL for reset links. Configurable so non-prod environments work too.
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://worldcup.chris.planow.com";

  const allMatches: Match[] = matchResult.success ? matchResult.data : [];
  const allResults: Result[] = resultsResult.success ? resultsResult.data : [];
  const initialAdvancers = advancersResult.success ? advancersResult.data : [];

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

  const groupsForKnockout = allGroups.map((g) => ({
    id: g.id,
    name: g.name,
    thirdPlaceTeam:
      allGroupTeams.find((t) => t.groupId === g.id && t.finalPosition === 3)?.teamName ?? null,
  }));

  const allGroupsHaveResults =
    allGroups.length === 12 &&
    allGroups.every((g) =>
      allGroupTeams
        .filter((t) => t.groupId === g.id)
        .every((t) => t.finalPosition !== null)
    );

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 sm:py-10">
      <SectionHeader
        title="Tournament Setup"
        subtitle="Admin controls for matchups, results, groups, and users."
        size="lg"
      />

      <div className="space-y-6">
        <Card variant="default" padding="lg">
          <SectionHeader
            title="Bracket controls"
            subtitle="Open or lock the bracket for user entry."
            size="sm"
          />
          <BracketLockToggle initialLocked={config.isLocked} />
        </Card>

        <Card variant="default" padding="lg">
          <SectionHeader
            title="Matchups"
            subtitle="Configure the 16 Round-of-32 pairings."
            size="sm"
          />
          <MatchupSetup existingMatches={allMatches} />
        </Card>

        <Card variant="default" padding="lg">
          <SectionHeader
            title="Match results"
            subtitle="Record or correct winners as matches conclude."
            size="sm"
          />
          <ResultsManager matches={allMatches} initialResults={allResults} />
        </Card>

        <Card variant="default" padding="lg">
          <SectionHeader
            title="Group stage"
            subtitle="Set up groups, enter final standings, and control picks."
            size="sm"
          />
          <div className="space-y-6">
            <GroupStageLockToggle initialLocked={config.groupStageLocked} />
            <GroupSetup existingGroups={groupsWithTeams} />
            {allGroups.length > 0 && (
              <GroupResultsEntry groups={groupsForResults} />
            )}
          </div>
        </Card>

        {allGroups.length === 12 && (
          <Card variant="default" padding="lg">
            <SectionHeader
              title="Knockout stage setup"
              subtitle="Golden Boot, third-place advancers, and R32 auto-seed."
              size="sm"
            />
            <KnockoutSetup
              groups={groupsForKnockout}
              initialAdvancers={initialAdvancers}
              initialTopScorer={config.actualTopScorer}
              allGroupsHaveResults={allGroupsHaveResults}
            />
          </Card>
        )}

        <Card variant="default" padding="lg">
          <SectionHeader
            title="User management"
            subtitle="Review pool members and generate password reset links."
            size="sm"
          />
          <AdminUserList users={allUsers} baseUrl={baseUrl} />
        </Card>
      </div>
    </div>
  );
}
