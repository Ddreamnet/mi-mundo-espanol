import { ReactNode } from "react";
import { Logo } from "../Logo";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: string | number;
}

interface PanelSidebarProps {
  items: SidebarItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function PanelSidebar({
  items,
  activeItem,
  onItemClick,
  collapsed,
  onCollapsedChange,
}: PanelSidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity",
          collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        onClick={() => onCollapsedChange(true)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300",
          "bg-panel-sidebar border-r border-panel-sidebar-border",
          // Mobile: slide in/out
          collapsed ? "-translate-x-full lg:translate-x-0" : "translate-x-0",
          // Desktop: collapse width
          collapsed ? "lg:w-[72px]" : "w-[280px]"
        )}
      >
        {/* Logo section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-panel-sidebar-border">
          <div className={cn("transition-opacity", collapsed && "lg:opacity-0 lg:w-0 lg:overflow-hidden")}>
            <Logo size="md" />
          </div>
          {/* Collapse button - desktop only */}
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-panel-sidebar-hover text-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {items.map((item) => {
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onItemClick(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "text-sm font-medium",
                  isActive
                    ? "bg-panel-sidebar-active text-panel-sidebar-active-foreground shadow-sm"
                    : "text-panel-sidebar-foreground/80 hover:bg-panel-sidebar-hover hover:text-panel-sidebar-foreground"
                )}
              >
                <span className={cn("flex-shrink-0", isActive ? "text-panel-sidebar-active-foreground" : "")}>
                  {item.icon}
                </span>
                <span
                  className={cn(
                    "flex-1 text-left whitespace-nowrap transition-all",
                    collapsed && "lg:opacity-0 lg:w-0 lg:overflow-hidden"
                  )}
                >
                  {item.label}
                </span>
                {item.badge && !collapsed && (
                  <span
                    className={cn(
                      "px-2 py-0.5 text-xs rounded-full",
                      isActive
                        ? "bg-panel-sidebar-active-foreground/20 text-panel-sidebar-active-foreground"
                        : "bg-panel-sidebar-foreground/10 text-panel-sidebar-foreground/70"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-panel-sidebar-border">
          <div
            className={cn(
              "text-xs text-panel-sidebar-foreground/50 text-center transition-opacity",
              collapsed && "lg:opacity-0"
            )}
          >
            Mi Mundo Español
          </div>
        </div>
      </aside>
    </>
  );
}
