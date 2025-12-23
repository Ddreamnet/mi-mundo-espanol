import { Phone, Mail, MessageCircle, Instagram, Facebook } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import contactIllustration from "@/assets/contact-illustration.png";

const contactInfo = [
  {
    icon: Phone,
    label: "Telefon",
    value: "+90 530 472 1875",
    href: "tel:+905304721875",
  },
  {
    icon: Mail,
    label: "Mail",
    value: "mimundoespanol@outlook.com",
    href: "mailto:mimundoespanol@outlook.com",
  },
  {
    icon: Mail,
    label: "Mail - 2",
    value: "mertaydin245@hotmail.com",
    href: "mailto:mertaydin245@hotmail.com",
  },
  {
    icon: MessageCircle,
    label: "Whatsapp",
    value: "WhatsApp ile İletişim",
    href: "https://wa.me/message/2ESUR45URXTFJ1",
  },
  {
    icon: Instagram,
    label: "Instagram",
    value: "@mi.mundo_espanol",
    href: "https://instagram.com/mi.mundo_espanol",
  },
  {
    icon: Facebook,
    label: "Facebook",
    value: "Mi Mundo Espanol",
    href: "https://facebook.com/MiMundoEspanol",
  },
];

export default function Contact() {
  return (
    <div className="min-h-screen bg-[hsl(var(--landing-bg))] flex flex-col">
      <LandingHeader />
      
      <main className="flex-1 pt-20 lg:pt-24">
        <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-20 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Contact Info */}
            <div>
              {/* Header */}
              <div className="mb-12">
                <h1 className="text-5xl lg:text-6xl font-bold text-[hsl(var(--landing-header-foreground))] mb-4 tracking-tight">
                  İletişim
                </h1>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-1 bg-primary rounded-full" />
                  <p className="text-xl text-primary font-semibold">
                    7/24 Destek
                  </p>
                </div>
              </div>

              {/* Contact Items - Clean List Style */}
              <div className="space-y-6">
                {contactInfo.map((item, index) => (
                  <a
                    key={index}
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="group flex items-center gap-5 py-3 border-b border-border/30 hover:border-primary/50 transition-all duration-300"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                      <item.icon className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
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
                  </a>
                ))}
              </div>
            </div>

            {/* Right Column - Illustration */}
            <div className="flex items-center justify-center lg:justify-end order-first lg:order-last">
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-2xl" />
                <img
                  src={contactIllustration}
                  alt="İletişim İllüstrasyonu"
                  className="relative w-full max-w-sm lg:max-w-md xl:max-w-lg object-contain"
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
