import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, matches, picks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { BracketView } from "@/components/bracket/BracketView";
import { checkBracketLock } from "@/lib/actions/admin";

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

  const [allMatches, userPicks, isLocked] = await Promise.all([
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
    checkBracketLock(),
  ]);

  const isReadOnly = user.bracketSubmitted || isLocked;

  return (
    <BracketView
      matches={allMatches}
      picks={userPicks}
      isReadOnly={isReadOnly}
      userId={user.id}
    />
  );
}
