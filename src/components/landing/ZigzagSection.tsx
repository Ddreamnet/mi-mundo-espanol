import { Check } from "lucide-react";
import placeholderImage from "@/assets/placeholder-4-3.jpeg";

interface ZigzagSectionProps {
  id?: string;
  title: string;
  items: string[];
  imageOnLeft?: boolean;
}

export function ZigzagSection({ id, title, items, imageOnLeft = false }: ZigzagSectionProps) {
  return (
    <section id={id} className="py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Image */}
          <div className={`${imageOnLeft ? "lg:order-1" : "lg:order-2"}`}>
            <div className="relative">
              <div className="absolute -inset-4 bg-[hsl(var(--primary)/0.15)] rounded-2xl blur-xl"></div>
              <img
                src={placeholderImage}
                alt={title}
                className="relative w-full aspect-[4/3] object-cover rounded-2xl shadow-xl"
              />
            </div>
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
