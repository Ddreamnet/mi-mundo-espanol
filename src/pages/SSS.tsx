import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface SSSContent {
  pageTitle: string;
  pageSubtitle: string;
  items: FAQItem[];
}

interface MultiLangSSSContent {
  tr: SSSContent;
  en: SSSContent;
  es: SSSContent;
}

function isMultiLangFormat(data: unknown): data is MultiLangSSSContent {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return "tr" in obj && "en" in obj && "es" in obj;
}

export default function SSS() {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const defaultSSS: SSSContent = {
    pageTitle: t("sss.pageTitle"),
    pageSubtitle: t("sss.pageSubtitle"),
    items: [],
  };

  const { data: rawContent } = useQuery({
    queryKey: ["page-content", "sss"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents")
        .select("content")
        .eq("page_key", "sss")
        .maybeSingle();
      if (error) throw error;
      return data?.content as unknown;
    },
    staleTime: 1000 * 60 * 5,
  });

  let content: SSSContent = defaultSSS;
  if (rawContent) {
    if (isMultiLangFormat(rawContent)) {
      const langContent = rawContent[language];
      content = { ...defaultSSS, ...langContent };
    } else {
      content = { ...defaultSSS, ...(rawContent as SSSContent) };
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main className="pt-24 lg:pt-28 pb-16">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <div className="text-center mb-12 lg:mb-16">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/15 mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-montserrat font-bold text-[hsl(42_42%_94%)] mb-4">
              {content.pageTitle}
            </h1>
            <p className="text-lg text-[hsl(1_85%_24%/0.8)] max-w-2xl mx-auto">{content.pageSubtitle}</p>
          </div>

          <div className="bg-card rounded-2xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/20">
            <Accordion type="single" collapsible className="w-full space-y-2">
              {content.items.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border border-border/30 rounded-xl px-4 data-[state=open]:bg-primary/5 transition-colors"
                >
                  <AccordionTrigger className="text-left font-semibold text-[hsl(1_85%_24%)] hover:text-primary hover:no-underline py-4">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-[hsl(1_85%_24%/0.8)] pb-4 leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
