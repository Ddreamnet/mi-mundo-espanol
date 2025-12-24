import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface HeroContent {
  mainTitle: string;
  subtitle: string;
  imageUrl: string;
  button1Text: string;
  button1Link: string;
  button2Text: string;
  button2Link: string;
}

const defaultHero: HeroContent = {
  mainTitle: "Mi Mundo Español",
  subtitle: "Senin İspanyolca Dünyan",
  imageUrl: "/lovable-uploads/2da228c0-e8c3-4d4d-ae77-9eeca2c98996.png",
  button1Text: "Hemen Başla",
  button1Link: "/iletisim",
  button2Text: "Dersler Hakkında",
  button2Link: "/dersler",
};

export function HeroSection() {
  const { data: content } = useQuery({
    queryKey: ["page-content", "hero"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents")
        .select("content")
        .eq("page_key", "hero")
        .maybeSingle();
      if (error) throw error;
      return data?.content as unknown as HeroContent | null;
    },
    staleTime: 1000 * 60 * 5, // 5 dakika cache
  });

  const hero = content ? { ...defaultHero, ...content } : defaultHero;

  return (
    <section id="hero" className="pt-20 lg:pt-24">
      <div className="container mx-auto px-4 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Image - Left on desktop */}
          <div className="order-2 lg:order-1">
            <img
              alt={hero.mainTitle}
              src={hero.imageUrl}
              className="w-full aspect-[4/3] object-contain"
            />
          </div>

          {/* Text Content - Right on desktop */}
          <div className="order-1 lg:order-2 text-center lg:text-left">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight mb-6"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 700,
              }}
            >
              {hero.mainTitle}
            </h1>
            <p
              style={{
                fontFamily: "'Yesteryear', cursive",
                color: "hsl(42, 42%, 94%)",
              }}
              className="text-xl mb-8 md:text-5xl"
            >
              {hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button variant="landing-primary" size="lg" asChild>
                <a href={hero.button1Link}>{hero.button1Text}</a>
              </Button>
              <Button variant="landing-secondary" size="lg" asChild>
                <a href={hero.button2Link}>{hero.button2Text}</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
