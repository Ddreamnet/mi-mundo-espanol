import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";

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

const defaultImageUrl = "/images/hero-default.jpg";

function isMultiLangFormat(data: unknown): data is MultiLangHeroContent {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return "tr" in obj && "en" in obj && "es" in obj;
}

export function HeroSection() {
  const { language } = useLanguage();
  const [imageLoaded, setImageLoaded] = useState(false);

  const { data: rawContent, isLoading } = useQuery({
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
  const getHero = (): HeroContent | null => {
    if (!rawContent) return null;
    
    if (isMultiLangFormat(rawContent)) {
      return rawContent[language] || rawContent.tr;
    }
    
    return null;
  };

  const hero = getHero();
  const imageUrl = hero?.imageUrl && hero.imageUrl.trim() !== '' ? hero.imageUrl : defaultImageUrl;

  // Preload image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = imageUrl;
    
    // Check if already cached
    if (img.complete) {
      setImageLoaded(true);
    }
  }, [imageUrl]);

  // Show loading state
  if (isLoading || !hero) {
    return (
      <section id="hero" className="pt-20 lg:pt-24">
        <div className="container mx-auto px-4 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="w-full aspect-[4/3] bg-muted/20 animate-pulse rounded-lg" />
            </div>
            <div className="order-1 lg:order-2 text-center lg:text-left">
              <div className="h-12 bg-muted/20 animate-pulse rounded mb-6 w-3/4 mx-auto lg:mx-0" />
              <div className="h-8 bg-muted/20 animate-pulse rounded mb-8 w-1/2 mx-auto lg:mx-0" />
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <div className="h-12 w-32 bg-muted/20 animate-pulse rounded" />
                <div className="h-12 w-32 bg-muted/20 animate-pulse rounded" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="hero" className="pt-20 lg:pt-24">
      <div className="container mx-auto px-4 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="relative w-full aspect-[4/3]">
              {!imageLoaded && (
                <div className="absolute inset-0 bg-muted/20 animate-pulse rounded-lg" />
              )}
              <img
                alt={hero.mainTitle}
                src={imageUrl}
                loading="eager"
                fetchPriority="high"
                className={`w-full h-full object-contain transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
              />
            </div>
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
