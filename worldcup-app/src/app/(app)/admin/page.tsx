import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;

  if (username !== process.env.ADMIN_USERNAME?.toLowerCase()) {
    redirect("/leaderboard");
  }

  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-lg text-slate-500">Admin tools coming soon</p>
    </div>
  );
}
