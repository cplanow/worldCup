import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMatches } from "@/lib/actions/admin";
import { MatchupSetup } from "@/components/admin/MatchupSetup";
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

  const result = await getMatches();
  const allMatches: Match[] = result.success ? result.data : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        Tournament Setup
      </h1>
      <MatchupSetup existingMatches={allMatches} />
    </div>
  );
}
