import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { UsernameForm } from "@/components/UsernameForm";

export default async function Home() {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;

  if (username) {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (user) {
      if (user.bracketSubmitted) {
        redirect("/leaderboard");
      }

      // TODO: Check tournament_config.is_locked when table exists (Story 2.2)
      const isLocked = false;

      if (isLocked) {
        redirect("/leaderboard?locked=1");
      }

      redirect("/bracket");
    }

    // Stale cookie — user not found in DB, clear it
    cookieStore.delete("username");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <main className="flex w-full max-w-sm flex-col items-center gap-8 px-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          worldCup
        </h1>
        <UsernameForm />
      </main>
    </div>
  );
}
