import { LockMessage } from "@/components/LockMessage";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ locked?: string }>;
}) {
  const params = await searchParams;
  const isLocked = params.locked === "1";

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      {isLocked && <LockMessage />}
      <p className="text-lg text-slate-500">Leaderboard coming soon</p>
    </div>
  );
}
