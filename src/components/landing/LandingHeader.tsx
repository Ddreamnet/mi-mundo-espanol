import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoginDialog } from "./LoginDialog";
import { Logo } from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { language, setLanguage, languages } = useLanguage();

  const navLinks = [
    {
      label: t("nav.home"),
      href: "#hero",
      isRoute: false,
    },
    {
      label: t("nav.lessons"),
      href: "/dersler",
      isRoute: true,
    },
    {
      label: t("nav.blog"),
      href: "/blog",
      isRoute: true,
    },
    {
      label: t("nav.contact"),
      href: "/iletisim",
      isRoute: true,
    },
  ];

  const handleNavClick = (link: { href: string; isRoute: boolean }) => {
    if (link.isRoute) {
      navigate(link.href);
    } else if (location.pathname !== "/") {
      navigate("/" + link.href);
    } else {
      const element = document.querySelector(link.href);
      element?.scrollIntoView({
        behavior: "smooth",
      });
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
    }
  };

  const currentLanguage = languages.find((l) => l.code === language) || languages[0];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--landing-header))] shadow-md">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo & Brand */}
            <button onClick={handleLogoClick} className="bg-transparent border-none cursor-pointer p-0">
              <Logo size="md" />
            </button>

            {/* Desktop Navigation - Center */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link)}
                  className="text-[hsl(var(--landing-header-foreground))] hover:text-primary transition-colors font-medium bg-transparent border-none cursor-pointer"
                >
                  {link.label}
                </button>
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
                    className="text-[hsl(var(--landing-header-foreground))] hover:bg-muted/20"
                  >
                    <Globe className="w-[25px] h-[25px]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={language === lang.code ? "bg-accent" : ""}
                    >
                      {lang.flag} {lang.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Login Button */}
              <Button variant="landing-header" onClick={() => setLoginDialogOpen(true)}>
                {t("nav.login")}
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
          <div className="lg:hidden bg-[hsl(var(--landing-header))] border-t border-border">
            <div className="container mx-auto px-4 py-4">
              <nav className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleNavClick(link);
                    }}
                    className="text-[hsl(var(--landing-header-foreground))] hover:text-primary transition-colors font-medium py-2 text-left bg-transparent border-none cursor-pointer"
                  >
                    {link.label}
                  </button>
                ))}
                <div className="flex items-center gap-4 pt-4 border-t border-border">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-[hsl(var(--landing-header-foreground))]">
                        <Globe className="w-4 h-4 mr-2" />
                        {currentLanguage.flag} {t("nav.language")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-card">
                      {languages.map((lang) => (
                        <DropdownMenuItem
                          key={lang.code}
                          onClick={() => setLanguage(lang.code)}
                          className={language === lang.code ? "bg-accent" : ""}
                        >
                          {lang.flag} {lang.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="landing-header"
                    className="flex-1"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setLoginDialogOpen(true);
                    }}
                  >
                    {t("nav.login")}
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
