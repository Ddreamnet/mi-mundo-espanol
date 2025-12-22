import { LandingHeader } from "./LandingHeader";
import { LandingFooter } from "./LandingFooter";
import { HeroSection } from "./HeroSection";
import { ZigzagSection } from "./ZigzagSection";
import { CTASection } from "./CTASection";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <main>
        <HeroSection />
        
        <ZigzagSection
          id="dersler"
          title="Neden Mi Mundo Español?"
          items={[
            "Birebir özel ders imkanı ile kişiye özel eğitim",
            "Deneyimli ve anadili İspanyolca olan eğitmenler",
            "Esnek ders saatleri ve online eğitim seçeneği",
            "DELE sınavlarına hazırlık programları",
          ]}
          imageOnLeft={false}
        />

        <ZigzagSection
          title="Sıfırdan Başlayan Öğrenciler İçin İlk Adımlar"
          items={[
            "Temel İspanyolca gramer ve cümle yapısı",
            "Günlük konuşma kalıpları ve pratik",
            "Dinleme ve anlama becerileri geliştirme",
            "Kültürel bilgi ve dil içi nüanslar",
          ]}
          imageOnLeft={true}
        />

        <CTASection />
      </main>

      <LandingFooter />
    </div>
  );
}
