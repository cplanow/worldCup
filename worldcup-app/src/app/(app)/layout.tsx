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
    <div className="min-h-screen bg-bg">
      <header className="bg-brand text-text-on-brand">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <h1 className="text-display-sm tracking-tight text-accent">
            worldCup
          </h1>
          <LogoutButton />
        </div>
        <TabNav isAdmin={isAdmin} />
      </header>
      <main>{children}</main>
    </div>
  );
}
