import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface HeroContent {
  mainTitle: string;
  subtitle: string;
  imageUrl: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
}

interface MultiLangHeroContent {
  tr: HeroContent;
  en: HeroContent;
  es: HeroContent;
}

const defaultImageUrl = "/lovable-uploads/2da228c0-e8c3-4d4d-ae77-9eeca2c98996.png";

function isMultiLangFormat(data: unknown): data is MultiLangHeroContent {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return "tr" in obj && "en" in obj && "es" in obj;
}

export function HeroSection() {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const defaultHero: HeroContent = {
    mainTitle: t("hero.mainTitle"),
    subtitle: t("hero.subtitle"),
    imageUrl: defaultImageUrl,
    primaryButtonText: t("hero.primaryButton"),
    primaryButtonLink: "/iletisim",
    secondaryButtonText: t("hero.secondaryButton"),
    secondaryButtonLink: "/dersler",
  };

  const { data: rawContent } = useQuery({
    queryKey: ["page-content", "hero"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents")
        .select("content")
        .eq("page_key", "hero")
        .maybeSingle();
      if (error) throw error;
      return data?.content as unknown;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Get content for current language
  let hero: HeroContent = defaultHero;
  if (rawContent) {
    if (isMultiLangFormat(rawContent)) {
      const langContent = rawContent[language];
      hero = { ...defaultHero, ...langContent };
    } else {
      hero = { ...defaultHero, ...(rawContent as HeroContent) };
    }
  }

  const imageUrl = hero.imageUrl && hero.imageUrl.trim() !== '' ? hero.imageUrl : defaultImageUrl;

  return (
    <section id="hero" className="pt-20 lg:pt-24">
      <div className="container mx-auto px-4 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="order-2 lg:order-1">
            <img
              alt={hero.mainTitle}
              src={imageUrl}
              className="w-full aspect-[4/3] object-contain"
            />
          </div>

          <div className="order-1 lg:order-2 text-center lg:text-left">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight mb-6"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}
            >
              {hero.mainTitle}
            </h1>
            <p
              style={{ fontFamily: "'Yesteryear', cursive", color: "hsl(42, 42%, 94%)" }}
              className="text-xl mb-8 md:text-5xl"
            >
              {hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button variant="landing-primary" size="lg" asChild>
                <Link to={hero.primaryButtonLink}>{hero.primaryButtonText}</Link>
              </Button>
              <Button variant="landing-secondary" size="lg" asChild>
                <Link to={hero.secondaryButtonLink}>{hero.secondaryButtonText}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
