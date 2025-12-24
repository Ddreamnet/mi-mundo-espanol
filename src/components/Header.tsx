import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Logo } from "./Logo";
import { Globe, Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";

interface HeaderProps {
  children?: ReactNode;
  rightActions?: ReactNode;
}

export function Header({ children, rightActions }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();
  const { language, setLanguage, languages } = useLanguage();

  const currentLanguage = languages.find((l) => l.code === language) || languages[0];

  const LanguageSelector = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLanguage.flag}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border-border z-50">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={language === lang.code ? "bg-accent" : ""}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="border-b border-border bg-card text-card-foreground">
      <div className="container mx-auto px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Logo size="md" />
          </div>

          {/* Center content - hidden on mobile */}
          <div className="flex-1 flex justify-center min-w-0 px-2">
            <div className="hidden md:block">{children}</div>
          </div>

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <LanguageSelector />
            {rightActions}
          </div>

          {/* Mobile menu */}
          <div className="flex lg:hidden items-center gap-2">
            <LanguageSelector />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 bg-card border-border">
                <div className="flex flex-col gap-4 mt-8">
                  {/* Mobile center content */}
                  {children && (
                    <div className="md:hidden pb-4 border-b border-border">
                      {children}
                    </div>
                  )}
                  {/* Mobile actions */}
                  <div className="flex flex-col gap-2">
                    {rightActions}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
}
