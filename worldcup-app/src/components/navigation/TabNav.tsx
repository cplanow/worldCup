"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <nav className="bg-[#0F2E23] border-b border-[#1A4A38]" aria-label="Main navigation">
      <div className="flex">
        {allTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-b-2 border-[#D4AF37] font-bold text-[#D4AF37]"
                  : "text-[#8BAF9E] hover:text-[#C8DDD2]"
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
