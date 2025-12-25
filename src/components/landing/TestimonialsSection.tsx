import { useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";

interface MultiLangText {
  tr: string;
  en: string;
  es: string;
}

interface Testimonial {
  id: string;
  quote: string | MultiLangText;
  author_name: string | null;
}

function isMultiLangText(val: unknown): val is MultiLangText {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return "tr" in obj && "en" in obj && "es" in obj;
}

// Fallback testimonials
const defaultTestimonials: Testimonial[] = [
  {
    id: "1",
    quote: "Mi Mundo Español ile İspanyolca öğrenmek hayatımın en iyi kararlarından biri oldu. Öğretmenim sayesinde kısa sürede konuşma becerim inanılmaz gelişti.",
    author_name: null,
  },
  {
    id: "2",
    quote: "DELE sınavına hazırlanırken aldığım destek paha biçilemezdi. Birebir ders formatı sayesinde eksiklerimi hızlıca kapattım.",
    author_name: null,
  },
  {
    id: "3",
    quote: "Online ders imkanı benim için büyük kolaylık sağladı. Esnek saatler ve kaliteli eğitim bir arada.",
    author_name: null,
  },
  {
    id: "4",
    quote: "Sıfırdan başladım ve şimdi İspanya'da rahatça iletişim kurabiliyorum. Teşekkürler Mi Mundo Español!",
    author_name: null,
  },
  {
    id: "5",
    quote: "Anadili İspanyolca olan bir eğitmenden ders almak gerçekten fark yaratıyor. Aksanımı ve telaffuzumu çok geliştirdim.",
    author_name: null,
  },
];

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const { language } = useLanguage();
  const { t } = useTranslation();

  const { data: dbTestimonials } = useQuery({
    queryKey: ["testimonials-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("id, quote, author_name")
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data as Testimonial[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const testimonials = dbTestimonials && dbTestimonials.length > 0 ? dbTestimonials : defaultTestimonials;

  // Get quote for current language
  const getQuote = (testimonial: Testimonial): string => {
    // Try to parse if it's a JSON string
    let quote = testimonial.quote;
    if (typeof quote === "string") {
      try {
        const parsed = JSON.parse(quote);
        if (isMultiLangText(parsed)) {
          return parsed[language] || parsed.tr || quote;
        }
      } catch {
        // Not JSON, return as is
        return quote;
      }
    }
    if (isMultiLangText(quote)) {
      return quote[language] || quote.tr || "";
    }
    return quote as string;
  };

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  }, [testimonials.length]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  }, [testimonials.length]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStart.current) {
      const diffX = Math.abs(e.clientX - dragStart.current.x);
      if (diffX > 10) isDragging.current = true;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragStart.current && isDragging.current) {
      const diffX = e.clientX - dragStart.current.x;
      if (diffX > 50) handlePrev();
      else if (diffX < -50) handleNext();
    }
    dragStart.current = null;
    isDragging.current = false;
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStart.current) {
      const diffX = Math.abs(e.touches[0].clientX - dragStart.current.x);
      if (diffX > 10) isDragging.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStart.current && isDragging.current) {
      const diffX = e.changedTouches[0].clientX - dragStart.current.x;
      if (diffX > 50) handlePrev();
      else if (diffX < -50) handleNext();
    }
    dragStart.current = null;
    isDragging.current = false;
  };

  const getCardStyle = (index: number) => {
    const diff = index - activeIndex;
    const normalizedDiff = (diff + testimonials.length) % testimonials.length;

    let position = normalizedDiff;
    if (normalizedDiff > 2) {
      position = normalizedDiff - testimonials.length;
    }

    const isCenter = position === 0;
    const isAdjacent = Math.abs(position) === 1;
    const isVisible = Math.abs(position) <= 2;

    if (!isVisible) {
      return {
        opacity: 0,
        transform: "scale(0.6) translateX(0)",
        zIndex: 0,
        pointerEvents: "none" as const,
      };
    }

    if (isCenter) {
      return {
        opacity: 1,
        transform: "scale(1) translateX(0)",
        zIndex: 30,
        pointerEvents: "auto" as const,
      };
    }

    if (isAdjacent) {
      const translateX = position < 0 ? "-95%" : "95%";
      return {
        opacity: 0.6,
        transform: `scale(0.85) translateX(${translateX})`,
        zIndex: 20,
        pointerEvents: "auto" as const,
      };
    }

    const translateX = position < 0 ? "-175%" : "175%";
    return {
      opacity: 0.3,
      transform: `scale(0.7) translateX(${translateX})`,
      zIndex: 10,
      pointerEvents: "none" as const,
    };
  };

  // Title based on language
  const sectionTitle = language === "tr" 
    ? "Öğrencilerimiz Ne Diyor?" 
    : language === "en" 
    ? "What Our Students Say?" 
    : "¿Qué Dicen Nuestros Estudiantes?";

  return (
    <section className="py-16 lg:py-24 overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground text-center mb-16">
          {sectionTitle}
        </h2>

        {/* Desktop Carousel */}
        <div className="hidden md:block relative">
          <div className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="absolute left-4 lg:left-12 z-40 h-12 w-12 rounded-full bg-card shadow-lg hover:bg-accent transition-all duration-300"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <div
              className="relative h-[320px] w-full max-w-4xl flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { dragStart.current = null; }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {testimonials.map((testimonial, index) => {
                const style = getCardStyle(index);
                return (
                  <div
                    key={testimonial.id}
                    className="absolute w-80 transition-all duration-500 ease-out"
                    style={{
                      opacity: style.opacity,
                      transform: style.transform,
                      zIndex: style.zIndex,
                      pointerEvents: style.pointerEvents,
                    }}
                  >
                    <TestimonialCard quote={getQuote(testimonial)} />
                  </div>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="absolute right-4 lg:right-12 z-40 h-12 w-12 rounded-full bg-card shadow-lg hover:bg-accent transition-all duration-300"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === activeIndex ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden relative">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="shrink-0 h-10 w-10 rounded-full bg-card shadow-lg hover:bg-accent"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="w-full max-w-[280px]">
              <TestimonialCard quote={getQuote(testimonials[activeIndex])} />
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="shrink-0 h-10 w-10 rounded-full bg-card shadow-lg hover:bg-accent"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === activeIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
                }`}
                aria-label={`Testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ quote }: { quote: string }) {
  return (
    <div className="relative pt-10">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl ring-4 ring-background">
          <User className="h-10 w-10 text-primary-foreground" />
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-xl pt-14 pb-8 px-6 border border-border/50">
        <blockquote className="text-card-foreground/80 text-center leading-relaxed">
          <span className="text-primary text-2xl font-serif">"</span>
          {quote}
          <span className="text-primary text-2xl font-serif">"</span>
        </blockquote>
      </div>
    </div>
  );
}
