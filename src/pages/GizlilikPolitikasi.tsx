import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Shield } from "lucide-react";

interface PolicySection {
  title: string;
  content: string;
}

interface PrivacyContent {
  pageTitle: string;
  pageSubtitle: string;
  lastUpdated: string;
  sections: PolicySection[];
}

const defaultPrivacy: PrivacyContent = {
  pageTitle: "Gizlilik Politikası",
  pageSubtitle: "Kişisel verilerinizin korunması bizim için önemlidir",
  lastUpdated: "24 Aralık 2024",
  sections: [
    {
      title: "Toplanan Bilgiler",
      content:
        "Hizmetlerimizi kullanırken ad, soyad, e-posta adresi ve telefon numarası gibi kişisel bilgilerinizi topluyoruz. Bu bilgiler yalnızca ders planlaması ve iletişim amacıyla kullanılmaktadır.",
    },
    {
      title: "Bilgilerin Kullanımı",
      content:
        "Toplanan bilgiler; ders programlarının düzenlenmesi, ödev takibi, ilerleme raporları ve sizinle iletişim kurmak amacıyla kullanılmaktadır. Bilgileriniz üçüncü taraflarla paylaşılmaz.",
    },
    {
      title: "Veri Güvenliği",
      content:
        "Kişisel verileriniz endüstri standardı güvenlik önlemleri ile korunmaktadır. Verilerinize yetkisiz erişimi önlemek için gerekli tüm teknik ve idari tedbirler alınmaktadır.",
    },
    {
      title: "Çerezler",
      content:
        "Web sitemiz, kullanıcı deneyimini iyileştirmek için çerezler kullanmaktadır. Tarayıcı ayarlarınızdan çerez tercihlerinizi yönetebilirsiniz.",
    },
    {
      title: "Haklarınız",
      content:
        "KVKK kapsamında kişisel verilerinize erişim, düzeltme ve silme haklarına sahipsiniz. Bu haklarınızı kullanmak için bizimle iletişime geçebilirsiniz.",
    },
    {
      title: "İletişim",
      content:
        "Gizlilik politikamız hakkında sorularınız için info@mimundoespanol.com adresinden bize ulaşabilirsiniz.",
    },
  ],
};

export default function GizlilikPolitikasi() {
  const { data: pageContent } = useQuery({
    queryKey: ["page-content", "gizlilik-politikasi"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents")
        .select("content")
        .eq("page_key", "gizlilik-politikasi")
        .maybeSingle();
      if (error) throw error;
      if (!data || !data.content) return null;
      return data.content as unknown as PrivacyContent;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Merge with defaults, ensuring sections from DB override defaults
  const content: PrivacyContent = pageContent
    ? {
        ...defaultPrivacy,
        ...pageContent,
        sections:
          pageContent.sections && pageContent.sections.length > 0 ? pageContent.sections : defaultPrivacy.sections,
      }
    : defaultPrivacy;

  return (
    <div className="min-h-screen bg-page-lessons">
      <LandingHeader />

      <main className="pt-24 lg:pt-28 pb-16">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          {/* Page Title */}
          <div className="text-center mb-12 lg:mb-16">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/15 mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-montserrat font-bold text-[hsl(1_85%_24%)] mb-4">
              {content.pageTitle.includes(" ") ? (
                <>
                  {content.pageTitle.split(" ").slice(0, -1).join(" ")}{" "}
                  <span>{content.pageTitle.split(" ").pop()}</span>
                </>
              ) : (
                content.pageTitle
              )}
            </h1>
            <p className="text-lg text-[hsl(1_85%_24%/0.8)] max-w-2xl mx-auto">{content.pageSubtitle}</p>
            <p className="text-sm text-[hsl(1_85%_24%/0.6)] mt-2">Son güncelleme: {content.lastUpdated}</p>
          </div>

          {/* Privacy Sections Accordion */}
          <div className="bg-card rounded-2xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/20">
            <Accordion
              type="multiple"
              defaultValue={content.sections.map((_, i) => `item-${i}`)}
              className="w-full space-y-2"
            >
              {content.sections.map((section, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border border-border/30 rounded-xl px-4 data-[state=open]:bg-primary/5 transition-colors"
                >
                  <AccordionTrigger className="text-left font-semibold text-[hsl(1_85%_24%)] hover:text-primary hover:no-underline py-4">
                    {section.title}
                  </AccordionTrigger>
                  <AccordionContent className="text-[hsl(1_85%_24%/0.8)] pb-4 leading-relaxed">
                    {section.content}
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
