"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { logoutUser } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await logoutUser();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="text-text-on-brand/80 hover:bg-white/10 hover:text-text-on-brand"
      >
        <Link href="/settings/password" aria-label="Settings">
          <Settings aria-hidden="true" />
          <span className="hidden sm:inline">Settings</span>
        </Link>
      </Button>
      <Button
        onClick={handleLogout}
        variant="ghost"
        size="sm"
        className="text-text-on-brand/80 hover:bg-white/10 hover:text-text-on-brand"
        aria-label="Log out"
      >
        <LogOut aria-hidden="true" />
        <span className="hidden sm:inline">Log out</span>
      </Button>
    </div>
  );
}
