import { LandingHeader } from "./LandingHeader";
import { LandingFooter } from "./LandingFooter";
import { HeroSection } from "./HeroSection";
import { ZigzagSection } from "./ZigzagSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { CTASection } from "./CTASection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import zigzag1Image from "@/assets/zigzag-1.png";
import zigzag2Image from "@/assets/zigzag-2.png";

interface MultiLangText {
  tr: string;
  en: string;
  es: string;
}

interface MultiLangItems {
  tr: string[];
  en: string[];
  es: string[];
}

interface ZigzagData {
  id: string;
  title: string | MultiLangText;
  items: string[] | MultiLangItems;
  image_url: string | null;
  image_on_left: boolean;
  is_active: boolean;
  order_index: number;
}

// Parse potentially nested JSON string (handles double-encoded JSON or JSON stored as string)
function parseJsonValue(val: unknown): unknown {
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      // Recursively parse in case it's double-encoded
      return parseJsonValue(parsed);
    } catch {
      return val; // Return as-is if not valid JSON
    }
  }
  return val;
}

function isMultiLangText(val: unknown): val is MultiLangText {
  const parsed = parseJsonValue(val);
  if (!parsed || typeof parsed !== "object") return false;
  const obj = parsed as Record<string, unknown>;
  return "tr" in obj || "en" in obj || "es" in obj;
}

function isMultiLangItems(val: unknown): val is MultiLangItems {
  const parsed = parseJsonValue(val);
  if (!parsed || typeof parsed !== "object") return false;
  const obj = parsed as Record<string, unknown>;
  return "tr" in obj && Array.isArray(obj.tr);
}

const defaultZigzags = [
  {
    id: "default-1",
    title: "Neden Mi Mundo Español?",
    items: [
      "Birebir özel ders imkanı ile kişiye özel eğitim",
      "Deneyimli ve anadili İspanyolca olan eğitmenler",
      "Esnek ders saatleri ve online eğitim seçeneği",
      "DELE sınavlarına hazırlık programları",
    ],
    image_url: zigzag1Image,
    image_on_left: false,
    is_active: true,
    order_index: 0,
  },
  {
    id: "default-2",
    title: "Sıfırdan Başlayan Öğrenciler İçin İlk Adımlar",
    items: [
      "Temel İspanyolca gramer ve cümle yapısı",
      "Günlük konuşma kalıpları ve pratik",
      "Dinleme ve anlama becerileri geliştirme",
      "Kültürel bilgi ve dil içi nüanslar",
    ],
    image_url: zigzag2Image,
    image_on_left: true,
    is_active: true,
    order_index: 1,
  },
];

export function LandingPage() {
  const { language } = useLanguage();

  const { data: zigzagSections } = useQuery({
    queryKey: ["zigzag-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zigzag_sections")
        .select("*")
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data as ZigzagData[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const zigzags = zigzagSections && zigzagSections.length > 0 ? zigzagSections : defaultZigzags;

  // Helper to get title for current language
  const getTitle = (section: ZigzagData): string => {
    const parsedTitle = parseJsonValue(section.title);
    
    if (parsedTitle && typeof parsedTitle === "object") {
      const titleObj = parsedTitle as MultiLangText;
      return titleObj[language] || titleObj.tr || "";
    }
    return typeof section.title === "string" ? section.title : "";
  };

  // Helper to get items for current language
  const getItems = (section: ZigzagData): string[] => {
    const parsedItems = parseJsonValue(section.items);
    
    if (parsedItems && typeof parsedItems === "object" && !Array.isArray(parsedItems)) {
      const itemsObj = parsedItems as MultiLangItems;
      const items = itemsObj[language];
      return items && items.length > 0 ? items : itemsObj.tr || [];
    }
    return Array.isArray(section.items) ? section.items : [];
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <main>
        <HeroSection />
        
        {zigzags.map((section, index) => (
          <ZigzagSection
            key={section.id}
            id={index === 0 ? "dersler" : undefined}
            title={getTitle(section)}
            items={getItems(section)}
            imageOnLeft={section.image_on_left}
            imageSrc={section.image_url || (index === 0 ? zigzag1Image : zigzag2Image)}
          />
        ))}

        <TestimonialsSection />

        <CTASection />
      </main>

      <LandingFooter />
    </div>
  );
}
