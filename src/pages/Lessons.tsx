import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { useTranslation } from "react-i18next";
import { Check, Phone, Mail, User, Users } from "lucide-react";
import lessonsIllustration from "@/assets/lessons-illustration.png";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, Language } from "@/contexts/LanguageContext";

interface LessonsContent {
  pageTitle: string;
  pageSubtitle: string;
  individualTitle: string;
  individualFeatures: string[];
  groupTitle: string;
  groupFeatures: string[];
  contactTitle: string;
  phone: string;
  email: string;
}

type MultiLangContent = {
  tr: LessonsContent;
  en: LessonsContent;
  es: LessonsContent;
};

export default function Lessons() {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const { data: pageContent, isLoading } = useQuery({
    queryKey: ["page-content", "lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents")
        .select("content")
        .eq("page_key", "lessons")
        .maybeSingle();
      if (error) throw error;
      return data?.content as unknown as MultiLangContent | null;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Get content for current language
  const getContent = (): LessonsContent | null => {
    if (!pageContent) return null;

    // Check if it's multi-lang format
    if ('tr' in pageContent && 'en' in pageContent && 'es' in pageContent) {
      return pageContent[language] || pageContent.tr;
    }

    return null;
  };

  const content = getContent();

  // Show loading or no content state
  if (isLoading || !content) {
    return (
      <div className="min-h-screen min-w-[100vw] bg-page-lessons">
        <LandingHeader />
        <main className="pt-24 lg:pt-28 pb-16 flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-foreground/50">Yükleniyor...</div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-[100vw] bg-page-lessons">
      <LandingHeader />

      <main className="pt-24 lg:pt-28 pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Page Title */}
          <div className="text-center mb-12 lg:mb-16">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-montserrat font-bold text-[hsl(42_42%_94%)] mb-4">
              {content.pageTitle}
            </h1>
            <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
              {content.pageSubtitle}
            </p>
          </div>

          {/* Cards Container */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 mb-20">
            {/* Bireysel Section */}
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-primary/15">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  {content.individualTitle}
                </h2>
              </div>
              
              <div className="group relative flex-1">
                <div className="absolute inset-0 bg-primary/5 rounded-2xl translate-y-2 blur-xl transition-all duration-500 group-hover:translate-y-4 group-hover:blur-2xl" />
                
                <div className="relative h-full bg-card rounded-2xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 ease-out group-hover:shadow-[0_20px_50px_rgb(0,0,0,0.15)] group-hover:-translate-y-1 border border-border/20">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40 rounded-t-2xl" />
                  
                  <ul className="space-y-4 pt-2">
                    {content.individualFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 transition-all duration-300">
                        <div className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-success/15 flex items-center justify-center border border-success/30">
                          <Check className="w-3 h-3 text-success" strokeWidth={3} />
                        </div>
                        <span className="text-card-foreground/85 text-sm lg:text-[15px] leading-relaxed">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Grup Section */}
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-accent/15">
                  <Users className="w-7 h-7 text-accent" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  {content.groupTitle}
                </h2>
              </div>
              
              <div className="group relative flex-1">
                <div className="absolute inset-0 bg-accent/5 rounded-2xl translate-y-2 blur-xl transition-all duration-500 group-hover:translate-y-4 group-hover:blur-2xl" />
                
                <div className="relative h-full bg-card rounded-2xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 ease-out group-hover:shadow-[0_20px_50px_rgb(0,0,0,0.15)] group-hover:-translate-y-1 border border-border/20">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent/40 via-accent/60 to-accent/40 rounded-t-2xl" />
                  
                  <ul className="space-y-4 pt-2">
                    {content.groupFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 transition-all duration-300">
                        <div className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-success/15 flex items-center justify-center border border-success/30">
                          <Check className="w-3 h-3 text-success" strokeWidth={3} />
                        </div>
                        <span className="text-card-foreground/85 text-sm lg:text-[15px] leading-relaxed">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-10">
              {content.contactTitle.includes("iletişim") ? (
                <>
                  {content.contactTitle.replace("iletişim", "")}<span className="text-primary">iletişim</span>
                </>
              ) : content.contactTitle.includes("contact") ? (
                <>
                  {content.contactTitle.replace("contact", "")}<span className="text-primary">contact</span>
                </>
              ) : content.contactTitle.includes("Contacto") ? (
                <>
                  <span className="text-primary">Contacto</span>{content.contactTitle.replace("Contacto", "")}
                </>
              ) : (
                content.contactTitle
              )}
            </h3>
            <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20">
              <div className="flex flex-col gap-6">
                <a
                  href={`tel:${content.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-4 text-foreground hover:text-primary transition-all duration-300 group"
                >
                  <div className="p-4 rounded-full bg-primary/15 group-hover:bg-primary/25 group-hover:scale-110 transition-all duration-300">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-lg lg:text-xl font-medium">{content.phone}</span>
                </a>
                <a
                  href={`mailto:${content.email}`}
                  className="flex items-center gap-4 text-foreground hover:text-primary transition-all duration-300 group"
                >
                  <div className="p-4 rounded-full bg-primary/15 group-hover:bg-primary/25 group-hover:scale-110 transition-all duration-300">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-lg lg:text-xl font-medium">{content.email}</span>
                </a>
              </div>

              <div className="w-full max-w-[260px] lg:max-w-[300px]">
                <img
                  src={lessonsIllustration}
                  alt={t("contact.imageAlt")}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
