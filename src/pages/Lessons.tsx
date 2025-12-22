import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Card } from "@/components/ui/card";
import { Check, Phone, Mail, User, Users, Award, Clock, BookOpen } from "lucide-react";
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
          <div className="text-center mb-12 lg:mb-16">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Ders <span className="text-primary">Programlarımız</span>
            </h1>
            <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
              İhtiyaçlarınıza uygun ders seçeneğini keşfedin
            </p>
          </div>

          {/* Cards Container */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 mb-20">
            {/* Bireysel Card */}
            <Card className="relative overflow-hidden bg-card border-0 shadow-xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 lg:p-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-card-foreground">
                      Bireysel
                    </h2>
                    <p className="text-card-foreground/70 text-sm mt-1">Birebir özel dersler</p>
                  </div>
                </div>
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/80 text-card-foreground/80 text-xs font-medium">
                    <Clock className="w-3.5 h-3.5" /> 40 dk
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/80 text-card-foreground/80 text-xs font-medium">
                    <BookOpen className="w-3.5 h-3.5" /> Esnek program
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/80 text-card-foreground/80 text-xs font-medium">
                    <Award className="w-3.5 h-3.5" /> Sertifika
                  </span>
                </div>
              </div>
              {/* Features */}
              <div className="p-6 lg:p-8">
                <ul className="space-y-3">
                  {individualFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 group">
                      <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-success" />
                      </div>
                      <span className="text-card-foreground/90 text-sm lg:text-base leading-relaxed">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* Grup Card */}
            <Card className="relative overflow-hidden bg-card border-0 shadow-xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-accent/20 to-accent/5 p-6 lg:p-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-accent/20 backdrop-blur-sm">
                    <Users className="w-8 h-8 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-card-foreground">
                      Grup
                    </h2>
                    <p className="text-card-foreground/70 text-sm mt-1">Küçük grup dersleri</p>
                  </div>
                </div>
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/80 text-card-foreground/80 text-xs font-medium">
                    <Clock className="w-3.5 h-3.5" /> 40 dk
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/80 text-card-foreground/80 text-xs font-medium">
                    <Users className="w-3.5 h-3.5" /> Max 5 kişi
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/80 text-card-foreground/80 text-xs font-medium">
                    <Award className="w-3.5 h-3.5" /> Sertifika
                  </span>
                </div>
              </div>
              {/* Features */}
              <div className="p-6 lg:p-8">
                <ul className="space-y-3">
                  {groupFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 group">
                      <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-success" />
                      </div>
                      <span className="text-card-foreground/90 text-sm lg:text-base leading-relaxed">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>

          {/* Contact Section - No Card */}
          <div className="text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
              Ücretlendirme için <span className="text-primary">iletişim</span>
            </h3>
            <div className="flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-20">
              {/* Contact Info */}
              <div className="flex flex-col gap-6">
                <a
                  href="tel:+905551234567"
                  className="flex items-center gap-4 text-foreground hover:text-primary transition-colors group"
                >
                  <div className="p-4 rounded-full bg-primary/20 group-hover:bg-primary/30 transition-colors">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-lg lg:text-xl font-medium">+90 555 123 45 67</span>
                </a>
                <a
                  href="mailto:info@mimundoespanol.com"
                  className="flex items-center gap-4 text-foreground hover:text-primary transition-colors group"
                >
                  <div className="p-4 rounded-full bg-primary/20 group-hover:bg-primary/30 transition-colors">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-lg lg:text-xl font-medium">info@mimundoespanol.com</span>
                </a>
              </div>

              {/* Illustration */}
              <div className="w-full max-w-[280px] lg:max-w-[320px]">
                <img
                  src={lessonsIllustration}
                  alt="İletişim"
                  className="w-full h-auto opacity-90"
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
