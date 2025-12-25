import { Instagram, Facebook } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage, Language } from "@/contexts/LanguageContext";

// WhatsApp icon component
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface FooterContent {
  links: { label: string; href: string }[];
  socialLinks: { icon: string; href: string; label: string }[];
  copyrightText: string;
}

type MultiLangContent = {
  tr: FooterContent;
  en: FooterContent;
  es: FooterContent;
};

const getIcon = (iconName: string) => {
  switch (iconName) {
    case "instagram": return Instagram;
    case "facebook": return Facebook;
    case "whatsapp": return WhatsAppIcon;
    default: return Instagram;
  }
};

const defaultFooter: MultiLangContent = {
  tr: {
    links: [
      { label: "İletişim", href: "/iletisim" },
      { label: "SSS", href: "/sss" },
      { label: "Blog", href: "/blog" },
      { label: "Gizlilik Politikası", href: "/gizlilik-politikasi" },
    ],
    socialLinks: [
      { icon: "instagram", href: "https://www.instagram.com/mi.mundo_espanol/", label: "Instagram" },
      { icon: "facebook", href: "#", label: "Facebook" },
      { icon: "whatsapp", href: "https://wa.me/+905304721875", label: "WhatsApp" },
    ],
    copyrightText: "Mi Mundo Español. Tüm hakları saklıdır.",
  },
  en: {
    links: [
      { label: "Contact", href: "/iletisim" },
      { label: "FAQ", href: "/sss" },
      { label: "Blog", href: "/blog" },
      { label: "Privacy Policy", href: "/gizlilik-politikasi" },
    ],
    socialLinks: [
      { icon: "instagram", href: "https://www.instagram.com/mi.mundo_espanol/", label: "Instagram" },
      { icon: "facebook", href: "#", label: "Facebook" },
      { icon: "whatsapp", href: "https://wa.me/+905304721875", label: "WhatsApp" },
    ],
    copyrightText: "Mi Mundo Español. All rights reserved.",
  },
  es: {
    links: [
      { label: "Contacto", href: "/iletisim" },
      { label: "Preguntas Frecuentes", href: "/sss" },
      { label: "Blog", href: "/blog" },
      { label: "Política de Privacidad", href: "/gizlilik-politikasi" },
    ],
    socialLinks: [
      { icon: "instagram", href: "https://www.instagram.com/mi.mundo_espanol/", label: "Instagram" },
      { icon: "facebook", href: "#", label: "Facebook" },
      { icon: "whatsapp", href: "https://wa.me/+905304721875", label: "WhatsApp" },
    ],
    copyrightText: "Mi Mundo Español. Todos los derechos reservados.",
  },
};

export function LandingFooter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { language } = useLanguage();

  const { data: pageContent } = useQuery({
    queryKey: ["page-content", "footer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents")
        .select("content")
        .eq("page_key", "footer")
        .maybeSingle();
      if (error) throw error;
      return data?.content as unknown as MultiLangContent | FooterContent | null;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Handle both multi-lang and legacy single-lang content
  const getContent = (): FooterContent => {
    if (!pageContent) return defaultFooter[language];

    // Check if it's multi-lang format
    if ('tr' in pageContent && 'en' in pageContent && 'es' in pageContent) {
      const multiLang = pageContent as MultiLangContent;
      return multiLang[language] || multiLang.tr;
    }

    // Legacy single-lang format - use as Turkish
    if (language === 'tr') {
      return { ...defaultFooter.tr, ...(pageContent as FooterContent) };
    }

    return defaultFooter[language];
  };

  const footer = getContent();

  const normalizeHref = (href: string) => {
    // Backward compatibility for older DB content
    if (href === "/contact") return "/iletisim";
    if (href === "/lessons") return "/dersler";
    if (href === "#sss") return "/sss";
    if (href === "#gizlilik") return "/gizlilik-politikasi";
    return href;
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
    }
  };

  const handleLinkClick = (e: React.MouseEvent, rawHref: string) => {
    e.preventDefault();
    const href = normalizeHref(rawHref);

    if (href.startsWith("#")) {
      if (location.pathname !== "/") {
        navigate("/" + href);
      } else {
        const element = document.querySelector(href);
        element?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    navigate(href);
  };

  return (
    <footer className="bg-[hsl(var(--landing-footer))] text-[hsl(var(--landing-footer-foreground))]">
      <div className="container mx-auto px-4 lg:px-8 py-6 lg:py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Brand */}
          <button onClick={handleLogoClick} className="bg-transparent border-none cursor-pointer p-0">
            <Logo size="md" />
          </button>

          {/* Links */}
          <div className="flex items-center gap-6">
            {footer.links.map((link) => (
              <button
                key={`${link.label}-${link.href}`}
                onClick={(e) => handleLinkClick(e, link.href)}
                className="text-sm text-[hsl(var(--landing-footer-foreground)/0.8)] hover:text-[hsl(var(--primary))] transition-colors bg-transparent border-none cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-2">
            {footer.socialLinks.map((social) => {
              const Icon = getIcon(social.icon);
              return (
                <Button
                  key={social.label}
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-9 w-9 text-[hsl(var(--landing-footer-foreground))] hover:bg-[hsl(var(--background)/0.1)] hover:text-[hsl(var(--primary))]"
                >
                  <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label}>
                    <Icon className="w-5 h-5" />
                  </a>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 pt-4 border-t border-[hsl(var(--background)/0.15)]">
          <p className="text-center text-xs text-[hsl(var(--landing-footer-foreground)/0.5)]">
            © {new Date().getFullYear()} {footer.copyrightText}
          </p>
        </div>
      </div>
    </footer>
  );
}
