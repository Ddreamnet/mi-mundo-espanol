import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface CTAContent {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
}

interface MultiLangCTAContent {
  tr: CTAContent;
  en: CTAContent;
  es: CTAContent;
}

function isMultiLangFormat(data: unknown): data is MultiLangCTAContent {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return "tr" in obj && "en" in obj && "es" in obj;
}

export function CTASection() {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const defaultCTA: CTAContent = {
    title: t("cta.title"),
    description: t("cta.description"),
    buttonText: t("cta.button"),
    buttonLink: "/iletisim",
  };

  const { data: rawContent } = useQuery({
    queryKey: ["page-content", "cta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents")
        .select("content")
        .eq("page_key", "cta")
        .maybeSingle();
      if (error) throw error;
      return data?.content as unknown;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Get content for current language
  let cta: CTAContent = defaultCTA;
  if (rawContent) {
    if (isMultiLangFormat(rawContent)) {
      const langContent = rawContent[language];
      cta = { ...defaultCTA, ...langContent };
    } else {
      cta = { ...defaultCTA, ...(rawContent as CTAContent) };
    }
  }

  return (
    <section id="iletisim" className="py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="bg-card rounded-3xl p-8 md:p-12 lg:p-16 text-center shadow-2xl">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-card-foreground mb-6">
            {cta.title}
          </h2>
          <p className="text-card-foreground/70 text-lg mb-8 max-w-2xl mx-auto">
            {cta.description}
          </p>
          <Button variant="landing-header" size="lg" asChild>
            <a
              href={cta.buttonLink}
              target={cta.buttonLink.startsWith("http") ? "_blank" : undefined}
              rel={cta.buttonLink.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {cta.buttonText}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
