import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TabNav } from "@/components/navigation/TabNav";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;

  if (!username) {
    redirect("/");
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .get();

  if (!user) {
    redirect("/");
  }

  const isAdmin = username === process.env.ADMIN_USERNAME?.toLowerCase();

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
