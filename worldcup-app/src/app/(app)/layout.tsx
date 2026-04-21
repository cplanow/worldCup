import { TabNav } from "@/components/navigation/TabNav";
import { LogoutButton } from "@/components/LogoutButton";
import { requireSessionOrRedirect, isAdminUsername } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSessionOrRedirect();
  const isAdmin = isAdminUsername(user.username);

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-[#0F2E23] px-4 py-3 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold tracking-tight text-[#D4AF37]">
          worldCup
        </h1>
        <LogoutButton />
      </header>
      <TabNav isAdmin={isAdmin} />
      <main>{children}</main>
    </div>
  );
}
