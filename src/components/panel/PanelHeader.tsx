import { ReactNode } from "react";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  userName?: string;
  actions?: ReactNode;
  onLogout?: () => void;
  isLoggingOut?: boolean;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

export function PanelHeader({
  title,
  subtitle,
  userName,
  actions,
  onLogout,
  isLoggingOut,
  onToggleSidebar,
}: PanelHeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-6 bg-panel-header border-b border-panel-header-border">
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-panel-header-foreground/5 text-panel-header-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Title */}
        <div>
          <h1 className="text-lg lg:text-xl font-semibold text-panel-header-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-panel-header-foreground/60 hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Welcome message - desktop only */}
        {userName && (
          <span className="hidden lg:block text-sm text-panel-header-foreground/70">
            Hoş geldin, <span className="font-medium text-panel-header-foreground">{userName}</span>
          </span>
        )}

        {/* Custom actions */}
        {actions}

        {/* Logout button */}
        {onLogout && (
          <Button
            onClick={onLogout}
            variant="ghost"
            size="sm"
            disabled={isLoggingOut}
            className="text-panel-header-foreground hover:bg-panel-header-foreground/10"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">{isLoggingOut ? "Çıkış..." : "Çıkış"}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
