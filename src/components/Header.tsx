import { ReactNode } from "react";
import { Logo } from "./Logo";

interface HeaderProps {
  children?: ReactNode;
  rightActions?: ReactNode;
}

export function Header({ children, rightActions }: HeaderProps) {
  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-shrink-0">
            <Logo size="lg" showBrandName={true} />
          </div>

          <div className="flex-1 flex justify-center min-w-0 px-2">
            <div className="hidden md:block">{children}</div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
            {rightActions}
          </div>
        </div>
      </div>
    </div>
  );
}
