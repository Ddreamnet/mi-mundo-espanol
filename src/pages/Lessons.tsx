import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Check, Phone, Mail, User, Users } from "lucide-react";
import lessonsIllustration from "@/assets/lessons-illustration.png";

const individualFeatures = [
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
];

const groupFeatures = [
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
];

export default function Lessons() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'hsl(228, 43%, 29%)' }}>
      <LandingHeader />

      <main className="pt-24 lg:pt-28 pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Page Title */}
          <div className="text-center mb-12 lg:mb-16">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Ders <span className="text-primary">Programlarımız</span>
            </h1>
            <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
              İhtiyaçlarınıza uygun ders seçeneğini keşfedin
            </p>
          </div>

          {/* Cards Container */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 mb-20">
            {/* Bireysel Section */}
            <div className="flex flex-col">
              {/* Title - Outside Card */}
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-primary/15">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Bireysel
                </h2>
              </div>
              
              {/* Floating Card */}
              <div className="group relative flex-1">
                {/* Shadow layer for depth */}
                <div className="absolute inset-0 bg-primary/5 rounded-2xl translate-y-2 blur-xl transition-all duration-500 group-hover:translate-y-4 group-hover:blur-2xl" />
                
                {/* Main Card */}
                <div className="relative h-full bg-card rounded-2xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 ease-out group-hover:shadow-[0_20px_50px_rgb(0,0,0,0.15)] group-hover:-translate-y-1 border border-border/20">
                  {/* Subtle gradient overlay */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40 rounded-t-2xl" />
                  
                  <ul className="space-y-4 pt-2">
                    {individualFeatures.map((feature, index) => (
                      <li 
                        key={index} 
                        className="flex items-start gap-3 transition-all duration-300"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
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
              {/* Title - Outside Card */}
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-accent/15">
                  <Users className="w-7 h-7 text-accent" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Grup
                </h2>
              </div>
              
              {/* Floating Card */}
              <div className="group relative flex-1">
                {/* Shadow layer for depth */}
                <div className="absolute inset-0 bg-accent/5 rounded-2xl translate-y-2 blur-xl transition-all duration-500 group-hover:translate-y-4 group-hover:blur-2xl" />
                
                {/* Main Card */}
                <div className="relative h-full bg-card rounded-2xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 ease-out group-hover:shadow-[0_20px_50px_rgb(0,0,0,0.15)] group-hover:-translate-y-1 border border-border/20">
                  {/* Subtle gradient overlay */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent/40 via-accent/60 to-accent/40 rounded-t-2xl" />
                  
                  <ul className="space-y-4 pt-2">
                    {groupFeatures.map((feature, index) => (
                      <li 
                        key={index} 
                        className="flex items-start gap-3 transition-all duration-300"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
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
              Ücretlendirme için <span className="text-primary">iletişim</span>
            </h3>
            <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20">
              {/* Contact Info */}
              <div className="flex flex-col gap-6">
                <a
                  href="tel:+905551234567"
                  className="flex items-center gap-4 text-foreground hover:text-primary transition-all duration-300 group"
                >
                  <div className="p-4 rounded-full bg-primary/15 group-hover:bg-primary/25 group-hover:scale-110 transition-all duration-300">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-lg lg:text-xl font-medium">+90 555 123 45 67</span>
                </a>
                <a
                  href="mailto:info@mimundoespanol.com"
                  className="flex items-center gap-4 text-foreground hover:text-primary transition-all duration-300 group"
                >
                  <div className="p-4 rounded-full bg-primary/15 group-hover:bg-primary/25 group-hover:scale-110 transition-all duration-300">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-lg lg:text-xl font-medium">info@mimundoespanol.com</span>
                </a>
              </div>

              {/* Illustration */}
              <div className="w-full max-w-[260px] lg:max-w-[300px]">
                <img
                  src={lessonsIllustration}
                  alt="İletişim"
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
