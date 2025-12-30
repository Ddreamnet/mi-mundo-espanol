import { Check } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";

interface ZigzagSectionProps {
  id?: string;
  title: string;
  items: string[];
  imageOnLeft?: boolean;
  imageSrc: string;
}

export function ZigzagSection({
  id,
  title,
  items,
  imageOnLeft = false,
  imageSrc
}: ZigzagSectionProps) {
  return (
    <section id={id} className="py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Image */}
          <div className={`${imageOnLeft ? "lg:order-1" : "lg:order-2"}`}>
            <OptimizedImage 
              src={imageSrc} 
              alt={title} 
              aspectRatio="aspect-[4/3]"
              className="object-contain" 
            />
          </div>

          {/* Content */}
          <div className={`${imageOnLeft ? "lg:order-2" : "lg:order-1"}`}>
            <div className="bg-card rounded-2xl p-8 lg:p-10 shadow-xl">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-card-foreground mb-8">
                {title}
              </h2>
              <ul className="space-y-4">
                {items.map((item, index) => (
                  <li key={index} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[hsl(var(--background))] flex items-center justify-center mt-0.5">
                      <Check className="w-4 h-4 text-foreground" />
                    </div>
                    <span className="text-card-foreground/90 text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
