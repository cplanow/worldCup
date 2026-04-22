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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-gradient px-6 py-10">
      {/* Subtle gold glow ornament — pure CSS, no JS */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full bg-accent/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-24 h-[360px] w-[360px] rounded-full bg-accent/10 blur-3xl"
      />

      <main className="relative z-10 flex w-full max-w-sm flex-col items-center gap-10 animate-fade-in">
        <div className="text-center">
          <h1 className="text-display-lg font-display text-accent">
            worldCup
          </h1>
          <p className="mt-3 text-sm font-medium uppercase tracking-[0.2em] text-text-on-brand/80">
            Bracket Pool 2026
          </p>
        </div>
        <AuthContainer />
      </main>
    </div>
  );
}
