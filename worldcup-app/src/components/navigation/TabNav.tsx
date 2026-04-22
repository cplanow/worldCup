"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { cn } from "@/lib/utils";

interface TabNavProps {
  isAdmin: boolean;
}

interface Tab {
  label: string;
  href: string;
}

const tabs: Tab[] = [
  { label: "Rules", href: "/rules" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Groups", href: "/groups" },
  { label: "My Bracket", href: "/bracket" },
];

export function TabNav({ isAdmin }: TabNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const allTabs: Tab[] = isAdmin
    ? [...tabs, { label: "Admin", href: "/admin" }]
    : tabs;

  const currentTab =
    allTabs.find((t) => pathname === t.href) ?? allTabs[0];

  return (
    <nav className="border-t border-white/10" aria-label="Main navigation">
      <div className="mx-auto max-w-[1120px] px-2 sm:px-4">
        {/* Desktop: full horizontal tabs */}
        <ul className="-mb-px hidden gap-2 sm:flex">
          {allTabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative inline-flex items-center whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "border-accent font-semibold text-accent"
                      : "border-transparent text-text-on-brand/70 hover:text-text-on-brand"
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Mobile: dropdown trigger showing current tab */}
        <div className="sm:hidden">
          <DropdownMenu.Root open={mobileOpen} onOpenChange={setMobileOpen}>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-2 py-3 text-sm font-semibold text-text-on-brand hover:bg-white/5"
                aria-label="Open navigation menu"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center justify-center rounded-md bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                    {currentTab.label}
                  </span>
                  <span className="text-text-on-brand/60">· menu</span>
                </span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    "transition-transform duration-200",
                    mobileOpen && "rotate-180"
                  )}
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                className={cn(
                  "z-50 min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-border bg-surface p-1 shadow-[var(--shadow-elevated)]",
                  "data-[state=open]:animate-slide-up"
                )}
              >
                {allTabs.map((tab) => {
                  const isActive = pathname === tab.href;
                  return (
                    <DropdownMenu.Item
                      key={tab.href}
                      asChild
                      onSelect={() => setMobileOpen(false)}
                    >
                      <Link
                        href={tab.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors",
                          "focus:bg-surface-2 data-[highlighted]:bg-surface-2",
                          isActive
                            ? "text-accent-strong"
                            : "text-text"
                        )}
                      >
                        {tab.label}
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="ml-3 inline-block h-1.5 w-1.5 rounded-full bg-accent"
                          />
                        )}
                      </Link>
                    </DropdownMenu.Item>
                  );
                })}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </nav>
  );
}
