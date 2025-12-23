import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  onClick?: () => void;
  selected?: boolean;
}

export function PanelCard({
  children,
  className,
  hover = false,
  padding = "md",
  onClick,
  selected,
}: PanelCardProps) {
  const paddingClasses = {
    none: "",
    sm: "p-3",
    md: "p-4 lg:p-5",
    lg: "p-5 lg:p-6",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl bg-card text-card-foreground shadow-panel transition-all duration-200",
        hover && "hover:shadow-card-hover hover:scale-[1.01] cursor-pointer",
        selected && "ring-2 ring-primary shadow-glow",
        onClick && "cursor-pointer",
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

interface PanelCardHeaderProps {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function PanelCardHeader({ children, className, action }: PanelCardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-4", className)}>
      <div className="flex-1">{children}</div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

interface PanelCardTitleProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function PanelCardTitle({ children, icon, className }: PanelCardTitleProps) {
  return (
    <h3 className={cn("text-lg font-semibold text-card-foreground flex items-center gap-2", className)}>
      {icon && <span className="text-icon-on-light">{icon}</span>}
      {children}
    </h3>
  );
}

interface PanelCardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function PanelCardDescription({ children, className }: PanelCardDescriptionProps) {
  return <p className={cn("text-sm text-card-foreground/60 mt-1", className)}>{children}</p>;
}

interface PanelCardContentProps {
  children: ReactNode;
  className?: string;
}

export function PanelCardContent({ children, className }: PanelCardContentProps) {
  return <div className={cn("", className)}>{children}</div>;
}
