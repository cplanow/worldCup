import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function SectionHeader({
  title,
  subtitle,
  action,
  size = "md",
  className,
  ...props
}: SectionHeaderProps) {
  const titleClass =
    size === "lg"
      ? "text-display-md"
      : size === "sm"
      ? "text-lg font-display font-bold"
      : "text-display-sm";

  return (
    <div
      className={cn("mb-6 flex items-start justify-between gap-4", className)}
      {...props}
    >
      <div className="min-w-0 flex-1">
        <h2 className={cn(titleClass, "text-text leading-tight")}>{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
