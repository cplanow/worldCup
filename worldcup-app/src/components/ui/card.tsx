import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-xl border text-text transition-[transform,box-shadow]",
  {
    variants: {
      variant: {
        // Default card — white surface on warm bg, soft shadow, lift on hover
        default:
          "border-border bg-surface shadow-[var(--shadow-card)]",
        // Elevated — larger shadow, no lift animation (used for modals/dialogs)
        elevated:
          "border-border bg-surface shadow-[var(--shadow-elevated)]",
        // Glass — auth-layer glassmorphism, for hero cards on gradient bg
        glass:
          "border-white/10 bg-white/10 backdrop-blur-md shadow-[var(--shadow-card)]",
        // Flat — no shadow, just a subtle border. Used for nested/inner cards
        flat:
          "border-border bg-surface",
        // Sunken — inset feel, for inputs-only panels / read-only groups
        sunken:
          "border-border bg-surface-sunken",
        // Brand — forest background for hero moments
        brand:
          "border-brand/20 bg-brand text-text-on-brand shadow-[var(--shadow-card)]",
      },
      interactive: {
        true: "cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]",
        false: "",
      },
      padding: {
        none: "p-0",
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
        xl: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
      padding: "lg",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, variant, interactive, padding, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant, interactive, padding }), className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-header"
      className={cn("mb-4 flex flex-col gap-1", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      data-slot="card-title"
      className={cn("font-display text-lg font-bold leading-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-text-muted", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-content" className={cn(className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-footer"
      className={cn("mt-4 flex items-center gap-2", className)}
      {...props}
    />
  );
}

export { cardVariants };
