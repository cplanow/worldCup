import { redirect } from "next/navigation";
import { AuthContainer } from "@/components/AuthContainer";
import { getSessionUser } from "@/lib/session";

export default async function Home() {
  const user = await getSessionUser();

  if (user) {
    if (user.bracketSubmitted) {
      redirect("/leaderboard");
    }
    redirect("/bracket");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0F2E23] via-[#132F25] to-[#0A1F17]">
      <main className="flex w-full max-w-sm flex-col items-center gap-8 px-6">
        <div className="text-center">
          <h1 className="font-display text-5xl font-extrabold tracking-tight text-[#D4AF37]">
            worldCup
          </h1>
          <p className="mt-2 text-sm text-[#8BAF9E]">Bracket Pool 2026</p>
        </div>
        <AuthContainer />
      </main>
    </div>
  );
}
