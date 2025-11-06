import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:scale-105",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gradient-to-r from-primary to-primary-dark text-primary-foreground hover:opacity-90 shadow-sm",
        secondary: "border-transparent bg-gradient-to-r from-secondary to-secondary text-secondary-foreground hover:opacity-90 shadow-sm",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        success: "border-transparent bg-success text-success-foreground hover:bg-success/90 shadow-sm",
        warning: "border-transparent bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm",
        outline: "text-foreground border-border/50 hover:bg-accent/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
