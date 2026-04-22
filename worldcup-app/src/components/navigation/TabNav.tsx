"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface TabNavProps {
  isAdmin: boolean;
}

const tabs = [
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Groups", href: "/groups" },
  { label: "My Bracket", href: "/bracket" },
];

export function TabNav({ isAdmin }: TabNavProps) {
  const pathname = usePathname();

  const allTabs = isAdmin
    ? [...tabs, { label: "Admin", href: "/admin" }]
    : tabs;

  return (
    <nav
      className="border-t border-white/10"
      aria-label="Main navigation"
    >
      <div className="mx-auto max-w-[1120px] px-2 sm:px-4">
        {/* Horizontal scroll on narrow viewports; snaps tabs flush on wider ones */}
        <ul className="-mb-px flex gap-1 overflow-x-auto sm:gap-2">
          {allTabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <li key={tab.href} className="shrink-0">
                <Link
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative inline-flex items-center whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors sm:px-4",
                    "border-b-2",
                    isActive
                      ? "border-accent text-accent font-semibold"
                      : "border-transparent text-text-on-brand/70 hover:text-text-on-brand"
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
