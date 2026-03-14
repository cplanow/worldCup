"use client";

import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/actions/auth";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await logoutUser();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-[#8BAF9E] hover:text-[#C8DDD2] transition-colors"
    >
      Log out
    </button>
  );
}
