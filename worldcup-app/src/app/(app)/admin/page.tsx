import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMatches, getTournamentConfig } from "@/lib/actions/admin";
import { MatchupSetup } from "@/components/admin/MatchupSetup";
import { BracketLockToggle } from "@/components/admin/BracketLockToggle";
import type { Match } from "@/types";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;

  if (
    !username ||
    username.toLowerCase() !== process.env.ADMIN_USERNAME?.toLowerCase()
  ) {
    redirect("/leaderboard");
  }

  const [result, config] = await Promise.all([
    getMatches(),
    getTournamentConfig(),
  ]);
  const allMatches: Match[] = result.success ? result.data : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        Tournament Setup
      </h1>
      <BracketLockToggle initialLocked={config.isLocked} />
      <div className="mt-6">
        <MatchupSetup existingMatches={allMatches} />
      </div>
    </div>
  );
}
