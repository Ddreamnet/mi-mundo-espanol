import { Phone, Mail, MessageCircle, Instagram, Facebook } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import contactIllustration from "@/assets/contact-illustration.png";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
interface ContactItem {
  icon: string;
  label: string;
  value: string;
  href: string;
}
interface ContactContent {
  pageTitle: string;
  supportText: string;
  contactItems: ContactItem[];
}
const getIcon = (iconName: string) => {
  switch (iconName) {
    case "phone":
      return Phone;
    case "mail":
      return Mail;
    case "whatsapp":
      return MessageCircle;
    case "instagram":
      return Instagram;
    case "facebook":
      return Facebook;
    default:
      return Mail;
  }
};
export default function Contact() {
  const {
    t
  } = useTranslation();
  const defaultContact: ContactContent = {
    pageTitle: t("contact.pageTitle"),
    supportText: t("contact.supportText"),
    contactItems: [{
      icon: "phone",
      label: t("contact.phone"),
      value: "+90 530 472 1875",
      href: "tel:+905304721875"
    }, {
      icon: "mail",
      label: t("contact.mail"),
      value: "mimundoespanol@outlook.com",
      href: "mailto:mimundoespanol@outlook.com"
    }, {
      icon: "mail",
      label: t("contact.mail") + " - 2",
      value: "mertaydin245@hotmail.com",
      href: "mailto:mertaydin245@hotmail.com"
    }, {
      icon: "whatsapp",
      label: t("contact.whatsapp"),
      value: t("contact.whatsappContact"),
      href: "https://wa.me/message/2ESUR45URXTFJ1"
    }, {
      icon: "instagram",
      label: t("contact.instagram"),
      value: "@mi.mundo_espanol",
      href: "https://instagram.com/mi.mundo_espanol"
    }, {
      icon: "facebook",
      label: t("contact.facebook"),
      value: "Mi Mundo Espanol",
      href: "https://facebook.com/MiMundoEspanol"
    }]
  };
  const {
    data: pageContent
  } = useQuery({
    queryKey: ["page-content", "contact"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("page_contents").select("content").eq("page_key", "contact").maybeSingle();
      if (error) throw error;
      return data?.content as unknown as ContactContent | null;
    },
    staleTime: 1000 * 60 * 5
  });
  const content = pageContent ? {
    ...defaultContact,
    ...pageContent
  } : defaultContact;
  return <div className="min-h-screen flex flex-col bg-page-contact">
      <LandingHeader />
      
      <main className="flex-1 pt-20 lg:pt-24">
        <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-20 pr-[128px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Column - Contact Info */}
            <div>
              {/* Header */}
              <div className="mb-12">
                <h1 className="text-5xl lg:text-6xl font-montserrat font-bold text-[hsl(42_42%_94%)] mb-4 tracking-tight">
                  {content.pageTitle}
                </h1>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-1 bg-primary rounded-full" />
                  <p className="text-xl text-primary font-semibold">
                    {content.supportText}
                  </p>
                </div>
              </div>

              {/* Contact Items */}
              <div className="space-y-6">
                {content.contactItems.map((item, index) => {
                const Icon = getIcon(item.icon);
                const href = item.href || "#";
                const isExternal = href.startsWith("http");
                return <a key={index} href={href} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined} className="group flex items-center gap-5 py-3 border-b border-border/30 hover:border-primary/50 transition-all duration-300">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                        <Icon className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
                          {item.label}
                        </p>
                        <p className="text-foreground font-medium group-hover:text-primary transition-colors">
                          {item.value}
                        </p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </a>;
              })}
              </div>
            </div>

            {/* Right Column - Illustration */}
            <div className="flex items-center justify-center lg:justify-end order-first lg:order-last">
              <img src={contactIllustration} alt={t("contact.imageAlt")} className="w-full max-w-sm lg:max-w-md xl:max-w-lg object-contain" />
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>;
}