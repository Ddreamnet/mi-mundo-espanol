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

const defaultLessons: MultiLangContent = {
  tr: {
    pageTitle: "Ders Programlarımız",
    pageSubtitle: "İhtiyaçlarınıza uygun ders seçeneğini keşfedin",
    individualTitle: "Bireysel",
    individualFeatures: [
      "40 dakikalık birebir ders",
      "Ücretsiz deneme dersi (seviye belirleme + içerik tanıtımı)",
      "Kişiye özel program (seviye, hedef ve öğrenme hızına göre)",
      "Esnek ders saatleriyle planlama",
      "Aula Internacional + gerekli ek materyallerin sağlanması",
      "Konuşma odaklı ders (akıcılık + telaffuz çalışmaları)",
      "Seviyeye uygun dil bilgisi anlatımı (örneklerle)",
      "Tema bazlı kelime çalışmaları",
      "Düzenli ödevlendirme ve geri bildirim",
      "Aylık ilerleme raporu",
      "Ders takibi",
      "Kur sonu sınavını başarıyla tamamlayanlara başarı sertifikası",
    ],
    groupTitle: "Grup",
    groupFeatures: [
      "40 dakikalık canlı grup dersleri",
      "Seviyeye göre küçük gruplar (max 5)",
      "Kurs öncesi seviye tespiti",
      "Seviye bazlı sınıflar (A1–A2–B1–B2)",
      "Aula Internacional ile yapılandırılmış müfredat",
      "Grup içi konuşma pratiği (diyaloglar + etkileşim)",
      "Grup seviyesine uygun dil bilgisi anlatımı",
      "Tema bazlı kelime çalışmaları",
      "Grup düzeyine uygun ödevlendirme",
      "Ödev kontrolü + genel geri bildirim",
      "Kur sonunda başarı sertifikası",
    ],
    contactTitle: "Ücretlendirme için iletişim",
    phone: "+90 555 123 45 67",
    email: "info@mimundoespanol.com",
  },
  en: {
    pageTitle: "Our Lesson Programs",
    pageSubtitle: "Discover the lesson option that suits your needs",
    individualTitle: "Individual",
    individualFeatures: [
      "40-minute one-on-one lesson",
      "Free trial lesson (level assessment + content introduction)",
      "Personalized program (based on level, goals and learning pace)",
      "Flexible scheduling",
      "Aula Internacional + additional materials provided",
      "Conversation-focused lesson (fluency + pronunciation practice)",
      "Level-appropriate grammar instruction (with examples)",
      "Theme-based vocabulary work",
      "Regular homework and feedback",
      "Monthly progress report",
      "Lesson tracking",
      "Certificate of achievement for those who successfully complete the course exam",
    ],
    groupTitle: "Group",
    groupFeatures: [
      "40-minute live group lessons",
      "Small groups by level (max 5)",
      "Pre-course level assessment",
      "Level-based classes (A1–A2–B1–B2)",
      "Structured curriculum with Aula Internacional",
      "Group conversation practice (dialogues + interaction)",
      "Group-level grammar instruction",
      "Theme-based vocabulary work",
      "Group-level homework assignments",
      "Homework review + general feedback",
      "Certificate of achievement at course completion",
    ],
    contactTitle: "Contact for pricing",
    phone: "+90 555 123 45 67",
    email: "info@mimundoespanol.com",
  },
  es: {
    pageTitle: "Nuestros Programas de Clases",
    pageSubtitle: "Descubre la opción de clase que se adapta a tus necesidades",
    individualTitle: "Individual",
    individualFeatures: [
      "Clase individual de 40 minutos",
      "Clase de prueba gratuita (evaluación de nivel + presentación de contenido)",
      "Programa personalizado (según nivel, objetivos y ritmo de aprendizaje)",
      "Horarios flexibles",
      "Aula Internacional + materiales adicionales proporcionados",
      "Clase enfocada en conversación (fluidez + práctica de pronunciación)",
      "Instrucción de gramática apropiada al nivel (con ejemplos)",
      "Trabajo de vocabulario temático",
      "Tareas regulares y retroalimentación",
      "Informe de progreso mensual",
      "Seguimiento de clases",
      "Certificado de logro para quienes completen exitosamente el examen del curso",
    ],
    groupTitle: "Grupal",
    groupFeatures: [
      "Clases grupales en vivo de 40 minutos",
      "Grupos pequeños por nivel (máx. 5)",
      "Evaluación de nivel previa al curso",
      "Clases por nivel (A1–A2–B1–B2)",
      "Currículo estructurado con Aula Internacional",
      "Práctica de conversación grupal (diálogos + interacción)",
      "Instrucción de gramática a nivel grupal",
      "Trabajo de vocabulario temático",
      "Tareas adecuadas al nivel del grupo",
      "Revisión de tareas + retroalimentación general",
      "Certificado de logro al completar el curso",
    ],
    contactTitle: "Contacto para precios",
    phone: "+90 555 123 45 67",
    email: "info@mimundoespanol.com",
  },
};

export default function Lessons() {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const { data: pageContent } = useQuery({
    queryKey: ["page-content", "lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents")
        .select("content")
        .eq("page_key", "lessons")
        .maybeSingle();
      if (error) throw error;
      return data?.content as unknown as MultiLangContent | LessonsContent | null;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Handle both multi-lang and legacy single-lang content
  const getContent = (): LessonsContent => {
    if (!pageContent) return defaultLessons[language];
    
    // Check if it's multi-lang format
    if ('tr' in pageContent && 'en' in pageContent && 'es' in pageContent) {
      const multiLang = pageContent as MultiLangContent;
      return multiLang[language] || multiLang.tr;
    }
    
    // Legacy single-lang format - use as Turkish
    if (language === 'tr') {
      return { ...defaultLessons.tr, ...(pageContent as LessonsContent) };
    }
    
    return defaultLessons[language];
  };

  const content = getContent();

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
