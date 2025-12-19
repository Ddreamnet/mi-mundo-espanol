import { useState } from "react";
import { Globe, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoginDialog } from "./LoginDialog";

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  const navLinks = [
    { label: "Ana Sayfa", href: "#hero" },
    { label: "Dersler", href: "#dersler" },
    { label: "İletişim", href: "#iletisim" },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--landing-header))] shadow-md">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo & Brand */}
            <a href="#" className="flex items-center gap-2 lg:gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-[hsl(var(--background))] flex items-center justify-center">
                <Globe className="w-5 h-5 lg:w-6 lg:h-6 text-[hsl(var(--foreground))]" />
              </div>
              <span className="font-bold text-lg lg:text-xl text-[hsl(var(--landing-header-foreground))]">
                Mi Mundo Español
              </span>
            </a>

            {/* Desktop Navigation - Center */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[hsl(var(--landing-header-foreground))] hover:text-[hsl(var(--primary))] transition-colors font-medium"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Desktop Right Side */}
            <div className="hidden lg:flex items-center gap-4">
              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-[hsl(var(--landing-header-foreground))] hover:bg-[hsl(var(--background)/0.1)]"
                  >
                    <Globe className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card">
                  <DropdownMenuItem>🇹🇷 Türkçe</DropdownMenuItem>
                  <DropdownMenuItem>🇪🇸 Español</DropdownMenuItem>
                  <DropdownMenuItem>🇬🇧 English</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Login Button */}
              <Button
                onClick={() => setLoginDialogOpen(true)}
                className="bg-[hsl(var(--background))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background)/0.9)]"
              >
                Giriş Yap
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[hsl(var(--landing-header-foreground))]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[hsl(var(--landing-header))] border-t border-[hsl(var(--border))]">
            <div className="container mx-auto px-4 py-4">
              <nav className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-[hsl(var(--landing-header-foreground))] hover:text-[hsl(var(--primary))] transition-colors font-medium py-2"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="flex items-center gap-4 pt-4 border-t border-[hsl(var(--border))]">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[hsl(var(--landing-header-foreground))]"
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        Dil
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-card">
                      <DropdownMenuItem>🇹🇷 Türkçe</DropdownMenuItem>
                      <DropdownMenuItem>🇪🇸 Español</DropdownMenuItem>
                      <DropdownMenuItem>🇬🇧 English</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setLoginDialogOpen(true);
                    }}
                    className="flex-1 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background)/0.9)]"
                  >
                    Giriş Yap
                  </Button>
                </div>
              </nav>
            </div>
          </div>
        )}
      </header>

      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </>
  );
}
