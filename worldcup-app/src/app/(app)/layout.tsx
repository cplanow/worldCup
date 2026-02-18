import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TabNav } from "@/components/navigation/TabNav";

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
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          worldCup
        </h1>
      </header>
      <TabNav isAdmin={isAdmin} />
      <main>{children}</main>
    </div>
  );
}
