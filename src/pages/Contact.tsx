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
        <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Contact Info */}
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold text-[hsl(var(--landing-header-foreground))] mb-3">
                  İletişim
                </h1>
                <p className="text-xl lg:text-2xl text-primary font-medium">
                  7/24 Destek
                </p>
              </div>

              <div className="space-y-5">
                {contactInfo.map((item, index) => (
                  <a
                    key={index}
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card hover:bg-card/80 border border-border/50 transition-all hover:shadow-md group"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">
                        {item.label}
                      </p>
                      <p className="text-foreground font-semibold">
                        {item.value}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Right Column - Illustration */}
            <div className="flex items-center justify-center lg:justify-end">
              <img
                src={contactIllustration}
                alt="İletişim İllüstrasyonu"
                className="w-full max-w-md lg:max-w-lg xl:max-w-xl object-contain"
              />
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
