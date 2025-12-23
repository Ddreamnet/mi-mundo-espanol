import { ReactNode, useState } from "react";
import { PanelSidebar, SidebarItem } from "./PanelSidebar";
import { PanelHeader } from "./PanelHeader";

interface PanelLayoutProps {
  children: ReactNode;
  sidebarItems: SidebarItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  userName?: string;
  onLogout?: () => void;
  isLoggingOut?: boolean;
}

export function PanelLayout({
  children,
  sidebarItems,
  activeItem,
  onItemClick,
  title,
  subtitle,
  headerActions,
  userName,
  onLogout,
  isLoggingOut,
}: PanelLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <PanelSidebar
        items={sidebarItems}
        activeItem={activeItem}
        onItemClick={onItemClick}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[280px]"
        }`}
      >
        {/* Header */}
        <PanelHeader
          title={title}
          subtitle={subtitle}
          userName={userName}
          actions={headerActions}
          onLogout={onLogout}
          isLoggingOut={isLoggingOut}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
