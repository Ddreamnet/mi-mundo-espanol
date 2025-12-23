import placeholderImage from "@/assets/placeholder-4-3.jpeg";
import { Button } from "@/components/ui/button";
export function HeroSection() {
  return (
    <section id="hero" className="pt-20 lg:pt-24">
      <div className="container mx-auto px-4 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Image - Left on desktop */}
          <div className="order-2 lg:order-1">
            <img
              alt="Mi Mundo Español"
              src="/lovable-uploads/2da228c0-e8c3-4d4d-ae77-9eeca2c98996.png"
              className="w-full aspect-[4/3] object-contain"
            />
          </div>

          {/* Text Content - Right on desktop */}
          <div className="order-1 lg:order-2 text-center lg:text-left">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight mb-6"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 700,
              }}
            >
              Mi Mundo Español
            </h1>
            <p
              style={{
                fontFamily: "'Yesteryear', cursive",
                color: "hsl(42, 42%, 94%)",
              }}
              className="text-xl mb-8 md:text-6xl"
            >
              Senin İspanyolca Dünyan
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button variant="landing-primary" size="lg" asChild>
                <a href="/iletisim">Hemen Başla</a>
              </Button>
              <Button variant="landing-secondary" size="lg" asChild>
                <a href="/dersler">Dersler Hakkında</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
