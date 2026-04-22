import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-surface-2 text-text-muted",
        brand: "bg-brand text-text-on-brand",
        accent: "bg-accent text-text-on-accent",
        success: "bg-success-bg text-success",
        warning: "bg-warning-bg text-warning",
        error: "bg-error-bg text-error",
        info: "bg-info-bg text-info",
        outline: "border border-border bg-transparent text-text",
        // For position / rank badges — gold ring on soft gold background
        rank: "bg-accent/15 text-accent-strong ring-2 ring-accent",
      },
      size: {
        sm: "px-1.5 py-0 text-[10px]",
        md: "px-2 py-0.5 text-xs",
        lg: "px-2.5 py-1 text-sm",
      },
      shape: {
        rect: "rounded-md",
        pill: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      shape: "rect",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, shape, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, shape }), className)}
      {...props}
    />
  );
}

export { badgeVariants };
