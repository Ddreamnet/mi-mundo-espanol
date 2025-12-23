import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Default - primary color
        default: "border-transparent bg-primary/15 text-primary",
        
        // Secondary - muted style for light surfaces
        secondary: "border-transparent bg-card-foreground/10 text-card-foreground/80",
        
        // Destructive
        destructive: "border-transparent bg-destructive/15 text-destructive",
        
        // Outline - bordered
        outline: "border-card-foreground/20 text-card-foreground/70 bg-transparent",
        
        // Success
        success: "border-transparent bg-success/15 text-success",
        
        // Warning
        warning: "border-transparent bg-warning/15 text-warning",
        
        // Muted - very subtle
        muted: "border-transparent bg-card-foreground/5 text-card-foreground/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
