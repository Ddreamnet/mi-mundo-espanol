import { LandingHeader } from "./LandingHeader";
import { LandingFooter } from "./LandingFooter";
import { HeroSection } from "./HeroSection";
import { ZigzagSection } from "./ZigzagSection";
import { CTASection } from "./CTASection";
import home1Image from "@/assets/placeholder-4-3.jpeg";
import home2Image from "@/assets/placeholder-4-3.jpeg";
import home3Image from "@/assets/home-3.png";

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
          image={home1Image}
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
          image={home2Image}
        />

        <ZigzagSection
          title="İleri Seviye ve DELE Hazırlık"
          items={[
            "DELE A1'den C2'ye tüm seviyelerde sınav hazırlığı",
            "Akademik yazma ve konuşma becerileri",
            "İş İspanyolcası ve profesyonel iletişim",
            "Gerçek sınav formatında pratik testler",
          ]}
          imageOnLeft={false}
          image={home3Image}
        />

        <CTASection />
      </main>

      <LandingFooter />
    </div>
  );
}
