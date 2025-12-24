import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

const defaultSSS: SSSContent = {
  pageTitle: "Sıkça Sorulan Sorular",
  pageSubtitle: "En çok merak edilen sorular ve cevapları",
  items: [
    {
      question: "Deneme dersi nasıl işliyor?",
      answer: "Deneme dersimiz 40 dakika sürmektedir. Bu derste seviyenizi belirliyor ve ders içeriklerini tanıtıyoruz. Deneme dersi tamamen ücretsizdir.",
    },
    {
      question: "Dersler ne kadar sürüyor?",
      answer: "Her ders 40 dakika sürmektedir. Bireysel ve grup dersleri için aynı süre geçerlidir.",
    },
    {
      question: "Grup dersleri kaç kişilik?",
      answer: "Grup derslerimiz maksimum 5 kişi ile sınırlıdır. Bu sayede her öğrenciye yeterli ilgi gösterebiliyoruz.",
    },
    {
      question: "Hangi materyaller kullanılıyor?",
      answer: "Derslerimizde Aula Internacional ders kitabı ve ihtiyaca göre ek materyaller kullanılmaktadır. Tüm materyaller tarafımızca sağlanmaktadır.",
    },
    {
      question: "Ders saatleri esnek mi?",
      answer: "Evet, bireysel derslerde esnek ders saatleri sunuyoruz. Programınıza uygun saatleri birlikte belirleyebiliriz.",
    },
    {
      question: "Ödev veriliyor mu?",
      answer: "Evet, derslerin pekişmesi için düzenli ödevler verilmektedir. Ödevlerinizi platform üzerinden takip edebilir ve geri bildirim alabilirsiniz.",
    },
  ],
};

export default function SSS() {
  const { data: pageContent } = useQuery({
    queryKey: ["page-content", "sss"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents")
        .select("content")
        .eq("page_key", "sss")
        .maybeSingle();
      if (error) throw error;
      if (!data || !data.content) return null;
      return data.content as unknown as SSSContent;
    },
    staleTime: 1000 * 60 * 5,
  });

  const content = pageContent ? { ...defaultSSS, ...pageContent } : defaultSSS;

  return (
    <div className="min-h-screen bg-page-lessons">
      <LandingHeader />

      <main className="pt-24 lg:pt-28 pb-16">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          {/* Page Title */}
          <div className="text-center mb-12 lg:mb-16">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/15 mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[hsl(1_85%_24%)] mb-4">
              {content.pageTitle.includes(" ") ? (
                <>
                  {content.pageTitle.split(" ").slice(0, -1).join(" ")}{" "}
                  <span className="text-primary">{content.pageTitle.split(" ").pop()}</span>
                </>
              ) : (
                content.pageTitle
              )}
            </h1>
            <p className="text-lg text-[hsl(1_85%_24%)]/80 max-w-2xl mx-auto">
              {content.pageSubtitle}
            </p>
          </div>

          {/* FAQ Accordion */}
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
                  <AccordionContent className="text-[hsl(1_85%_24%)]/80 pb-4 leading-relaxed">
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
