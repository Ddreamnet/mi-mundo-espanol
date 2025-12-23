import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary - dark burgundy, for main actions on light surfaces
        default:
          "bg-btn-primary text-btn-primary-foreground hover:bg-btn-primary-hover shadow-sm active:scale-[0.98]",
        
        // Destructive - red for dangerous actions
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        
        // Outline - bordered button for secondary actions
        outline:
          "border-2 border-btn-outline-border bg-transparent text-btn-outline-foreground hover:bg-btn-outline-hover",
        
        // Secondary - muted background
        secondary:
          "bg-btn-secondary text-btn-secondary-foreground hover:bg-btn-secondary-hover",
        
        // Ghost - no background, subtle hover
        ghost:
          "text-btn-ghost-foreground hover:bg-btn-ghost-hover",
        
        // Link - text only, underline on hover
        link:
          "text-primary underline-offset-4 hover:underline",

        // Tab inactive - for tab navigation on light surfaces
        "tab-inactive":
          "bg-transparent text-tab-inactive hover:bg-muted hover:text-card-foreground font-medium",
        
        // Tab active - for active tab
        "tab-active":
          "bg-tab-active-bg text-tab-active-fg shadow-sm font-medium",

        // Landing page variants
        "landing-primary":
          "bg-foreground text-background hover:bg-foreground/90 shadow-lg font-semibold",
        
        "landing-secondary":
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md font-semibold",
        
        "landing-header":
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-medium",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
