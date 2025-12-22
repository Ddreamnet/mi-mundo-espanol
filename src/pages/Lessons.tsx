import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Card } from "@/components/ui/card";
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
    <div className="min-h-screen bg-background">
      <LandingHeader />

      <main className="pt-24 lg:pt-28 pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Ders <span className="text-primary">Programlarımız</span>
            </h1>
            <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
              İhtiyaçlarınıza uygun ders seçeneğini keşfedin
            </p>
          </div>

          {/* Cards Container */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
            {/* Bireysel Card */}
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/20">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Bireysel
                </h2>
              </div>
              <Card className="flex-1 p-6 lg:p-8 bg-card">
                <ul className="space-y-3">
                  {individualFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <Check className="w-5 h-5 text-success" />
                      </div>
                      <span className="text-card-foreground text-sm lg:text-base">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Grup Card */}
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Grup
                </h2>
              </div>
              <Card className="flex-1 p-6 lg:p-8 bg-card">
                <ul className="space-y-3">
                  {groupFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <Check className="w-5 h-5 text-success" />
                      </div>
                      <span className="text-card-foreground text-sm lg:text-base">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-card rounded-2xl p-8 lg:p-12">
            <h3 className="text-2xl md:text-3xl font-bold text-card-foreground text-center mb-8">
              Ücretlendirme için iletişim
            </h3>
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
              {/* Contact Info */}
              <div className="flex flex-col gap-6">
                <a
                  href="tel:+905551234567"
                  className="flex items-center gap-4 text-card-foreground hover:text-primary transition-colors group"
                >
                  <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-lg font-medium">+90 555 123 45 67</span>
                </a>
                <a
                  href="mailto:info@mimundoespanol.com"
                  className="flex items-center gap-4 text-card-foreground hover:text-primary transition-colors group"
                >
                  <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-lg font-medium">info@mimundoespanol.com</span>
                </a>
              </div>

              {/* Illustration */}
              <div className="w-full max-w-xs lg:max-w-sm">
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
