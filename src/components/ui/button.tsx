import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary button - uses centralized btn-primary colors
        default: "bg-btn-primary text-btn-primary-foreground hover:bg-btn-primary-hover active:opacity-90 shadow-sm",
        // Destructive button
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/85 active:bg-destructive/75 shadow-sm",
        // Outline button - for dark backgrounds (header), light bg with dark text
        outline: "bg-btn-outline border border-btn-outline-border text-btn-outline-foreground hover:bg-btn-outline-hover",
        // Secondary button - uses centralized btn-secondary colors
        secondary: "bg-btn-secondary text-btn-secondary-foreground hover:bg-btn-secondary-hover active:opacity-90 shadow-sm",
        // Ghost button - uses centralized btn-ghost colors
        ghost: "text-btn-ghost-foreground hover:bg-btn-ghost-hover",
        // Link button
        link: "text-primary underline-offset-4 hover:underline",
        // Card variant - for buttons on light card backgrounds
        card: "bg-card-foreground/10 text-card-foreground hover:bg-card-foreground/20 border border-card-foreground/20",
        // Card ghost variant - for ghost buttons on card backgrounds
        "card-ghost": "text-card-foreground hover:bg-card-foreground/10",
        // Tab inactive variant - for inactive tabs on light card backgrounds
        "tab-inactive": "bg-card-foreground/10 text-card-foreground border border-card-foreground/20 hover:bg-card-foreground/20 font-medium",
        // Tab active variant - for active tabs
        "tab-active": "bg-btn-primary text-btn-primary-foreground hover:bg-btn-primary-hover active:opacity-90 shadow-md border-2 border-btn-primary font-semibold",
        // Landing page primary button - light cream bg for dark background
        "landing-primary": "bg-btn-landing-primary text-btn-landing-primary-foreground hover:bg-btn-landing-primary-hover active:opacity-90 shadow-lg font-semibold",
        // Landing page secondary button - dark burgundy bg for dark background
        "landing-secondary": "bg-btn-landing-secondary text-btn-landing-secondary-foreground hover:bg-btn-landing-secondary-hover active:opacity-90 shadow-md font-semibold",
        // Landing page outline button - transparent with cream border
        "landing-outline": "border-2 border-btn-landing-outline-border bg-transparent text-btn-landing-outline-foreground hover:bg-btn-landing-outline-hover font-semibold",
        // Landing page header button - dark burgundy for light header
        "landing-header": "bg-btn-landing-header text-btn-landing-header-foreground hover:bg-btn-landing-header-hover shadow-md font-semibold",
      },
      size: {
        default: "h-10 px-5 py-2 rounded-md",
        sm: "h-9 px-4 rounded-md text-sm",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
