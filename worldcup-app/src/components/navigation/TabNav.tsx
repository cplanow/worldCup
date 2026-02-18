"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface TabNavProps {
  isAdmin: boolean;
}

const tabs = [
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "My Bracket", href: "/bracket" },
];

export function TabNav({ isAdmin }: TabNavProps) {
  const pathname = usePathname();

  const allTabs = isAdmin
    ? [...tabs, { label: "Admin", href: "/admin" }]
    : tabs;

  return (
    <nav className="border-b border-slate-200 bg-white" aria-label="Main navigation">
      <div className="flex">
        {allTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-b-2 border-slate-900 font-bold text-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
