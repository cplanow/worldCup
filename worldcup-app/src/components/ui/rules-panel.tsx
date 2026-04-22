"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Collapsible } from "radix-ui";
import { Info, ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface RulesPanelProps {
  /** localStorage key — one per pick page so each persists independently */
  storageKey: string;
  /** Default open when the user hasn't set a preference AND this is true */
  defaultOpenWhenUnsubmitted: boolean;
  /** True once the user has submitted; pushes default state toward collapsed */
  submitted: boolean;
  title: string;
  /** One-line summary shown when collapsed */
  collapsedSummary: string;
  /** Full content shown when expanded */
  children: React.ReactNode;
  /** Anchor on /rules for "See full rules →" link */
  rulesAnchor?: string;
}

/**
 * Collapsible "how scoring works" panel. Expanded by default for users who
 * haven't submitted yet; collapsed-by-default for submitted users. Either
 * way the user's explicit toggle wins once they set it.
 */
export function RulesPanel({
  storageKey,
  defaultOpenWhenUnsubmitted,
  submitted,
  title,
  collapsedSummary,
  children,
  rulesAnchor,
}: RulesPanelProps) {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage?.getItem?.(storageKey) ?? null;
    } catch {
      /* ignore — private mode or test env without localStorage */
    }
    if (stored === "open") setOpen(true);
    else if (stored === "closed") setOpen(false);
    else setOpen(submitted ? false : defaultOpenWhenUnsubmitted);
  }, [storageKey, submitted, defaultOpenWhenUnsubmitted]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    try {
      window.localStorage?.setItem?.(storageKey, next ? "open" : "closed");
    } catch {
      /* ignore quota / private mode */
    }
  }

  // Pre-hydration placeholder — matches collapsed height to avoid layout shift
  if (open === null) {
    return (
      <div className="mb-4 h-12 rounded-xl border border-border bg-surface-2" />
    );
  }

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={handleOpenChange}
      className="mb-4 rounded-xl border border-border bg-surface-2"
    >
      <Collapsible.Trigger
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left",
          "transition-colors hover:bg-surface-sunken",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
          <div className="min-w-0">
            <span className="block text-sm font-semibold text-text">{title}</span>
            {!open && (
              <span className="block truncate text-xs text-text-muted">
                {collapsedSummary}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-muted transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=open]:animate-fade-in">
        <div className="border-t border-border px-4 pb-4 pt-3 text-sm text-text">
          {children}
          {rulesAnchor && (
            <div className="mt-3">
              <Link
                href={`/rules${rulesAnchor}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-accent-strong hover:text-accent-hover hover:underline"
              >
                See full rules <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
