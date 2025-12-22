import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section id="iletisim" className="py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="bg-card rounded-3xl p-8 md:p-12 lg:p-16 text-center shadow-2xl">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-card-foreground mb-6">
            Eğer Hazırsan Hemen Bilgi Al!
          </h2>
          <p className="text-card-foreground/70 text-lg mb-8 max-w-2xl mx-auto">
            İspanyolca öğrenme yolculuğuna bugün başla. Sana özel ders planları ve birebir eğitim ile hedeflerine ulaş.
          </p>
          <Button
            variant="landing-header"
            size="lg"
            asChild
          >
            <a
              href="https://wa.me/+905304721875"
              target="_blank"
              rel="noopener noreferrer"
            >
              İletişim
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
