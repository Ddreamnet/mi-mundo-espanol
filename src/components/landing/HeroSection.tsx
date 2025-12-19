import placeholderImage from "@/assets/placeholder-4-3.jpeg";

export function HeroSection() {
  return (
    <section id="hero" className="pt-20 lg:pt-24">
      <div className="container mx-auto px-4 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Image - Left on desktop */}
          <div className="order-2 lg:order-1">
            <div className="relative">
              <div className="absolute -inset-4 bg-[hsl(var(--primary)/0.2)] rounded-2xl blur-xl"></div>
              <img
                src={placeholderImage}
                alt="Mi Mundo Español"
                className="relative w-full aspect-[4/3] object-cover rounded-2xl shadow-2xl"
              />
            </div>
          </div>

          {/* Text Content - Right on desktop */}
          <div className="order-1 lg:order-2 text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Mi Mundo
              <span className="block text-primary">Español</span>
            </h1>
            <p className="text-xl md:text-2xl text-foreground/80 mb-8">
              Senin İspanyolca Dünyan
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a
                href="#iletisim"
                className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
              >
                Hemen Başla
              </a>
              <a
                href="#dersler"
                className="inline-flex items-center justify-center px-8 py-4 bg-card text-card-foreground font-semibold rounded-lg hover:bg-card/90 transition-colors shadow-lg hover:shadow-xl"
              >
                Dersler Hakkında
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
