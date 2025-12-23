import { ReactNode } from "react";
import { Logo } from "./Logo";

interface HeaderProps {
  children?: ReactNode;
  rightActions?: ReactNode;
}

export function Header({ children, rightActions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-header-border bg-header shadow-soft">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Logo size="md" />
          </div>

          {/* Center content - title */}
          <div className="flex-1 flex justify-center min-w-0">
            <div className="hidden md:block">{children}</div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {rightActions}
          </div>
        </div>
      </div>
    </header>
  );
}
