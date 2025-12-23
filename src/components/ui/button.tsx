import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary - dark burgundy with light text (for light surfaces)
        default:
          "bg-btn-primary text-btn-primary-foreground hover:bg-btn-primary-hover active:scale-[0.98] shadow-sm",
        
        // Destructive
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98] shadow-sm",
        
        // Outline - bordered, for light surfaces
        outline:
          "border border-btn-outline-border bg-transparent text-btn-outline-foreground hover:bg-btn-outline-hover",
        
        // Secondary - muted background for secondary actions
        secondary:
          "bg-btn-secondary text-btn-secondary-foreground hover:bg-btn-secondary-hover active:scale-[0.98]",
        
        // Ghost - transparent, reveals on hover
        ghost:
          "text-btn-ghost-foreground hover:bg-btn-ghost-hover",
        
        // Link style
        link: "text-primary underline-offset-4 hover:underline",

        // === PANEL SPECIFIC VARIANTS ===
        
        // Panel header button - for light header background
        "panel-header":
          "text-panel-header-foreground hover:bg-panel-header-foreground/10",
        
        // Panel sidebar button - for dark sidebar
        "panel-sidebar":
          "text-panel-sidebar-foreground/80 hover:bg-panel-sidebar-hover hover:text-panel-sidebar-foreground",
        
        // Panel sidebar active - gold accent
        "panel-sidebar-active":
          "bg-panel-sidebar-active text-panel-sidebar-active-foreground shadow-sm",

        // === TAB VARIANTS ===
        
        // Tab inactive - for light card backgrounds
        "tab-inactive":
          "text-card-foreground/70 hover:text-card-foreground hover:bg-card-foreground/5 border-b-2 border-transparent",
        
        // Tab active - highlighted with primary color
        "tab-active":
          "text-card-foreground font-semibold border-b-2 border-primary bg-primary/5",

        // === LANDING PAGE VARIANTS ===
        
        // Landing primary - cream button for dark background
        "landing-primary":
          "bg-btn-landing-primary text-btn-landing-primary-foreground hover:bg-btn-landing-primary-hover active:scale-[0.98] shadow-lg font-semibold",
        
        // Landing secondary - dark button for dark background
        "landing-secondary":
          "bg-btn-landing-secondary text-btn-landing-secondary-foreground hover:bg-btn-landing-secondary-hover active:scale-[0.98] shadow-md font-semibold",
        
        // Landing outline - transparent with cream border
        "landing-outline":
          "border-2 border-btn-landing-outline-border bg-transparent text-btn-landing-outline-foreground hover:bg-foreground/10 font-semibold",
        
        // Landing header - for light header
        "landing-header":
          "bg-btn-landing-header text-btn-landing-header-foreground hover:bg-btn-landing-header-hover shadow-md font-semibold",

        // === ICON BUTTON VARIANTS ===
        
        // Icon button for light surfaces
        "icon-light":
          "text-icon-on-light hover:bg-card-foreground/10 rounded-lg",
        
        // Icon button for dark surfaces
        "icon-dark":
          "text-icon-default hover:bg-foreground/10 rounded-lg",

        // Card ghost - for buttons on card/light backgrounds (legacy support)
        "card-ghost":
          "text-card-foreground hover:bg-card-foreground/10",
      },
      size: {
        default: "h-10 px-5 py-2 rounded-lg",
        sm: "h-9 px-4 rounded-lg text-sm",
        lg: "h-11 px-8 rounded-lg text-base",
        xl: "h-12 px-10 rounded-lg text-base font-semibold",
        icon: "h-10 w-10 rounded-lg",
        "icon-sm": "h-8 w-8 rounded-lg",
        "icon-lg": "h-12 w-12 rounded-lg",
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
