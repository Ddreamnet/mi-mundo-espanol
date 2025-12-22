import { Check } from "lucide-react";

interface ZigzagSectionProps {
  id?: string;
  title: string;
  items: string[];
  imageOnLeft?: boolean;
  image: string;
}

export function ZigzagSection({
  id,
  title,
  items,
  imageOnLeft = false,
  image
}: ZigzagSectionProps) {
  return (
    <section id={id} className="py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Image */}
          <div className={`${imageOnLeft ? "lg:order-1" : "lg:order-2"}`}>
            <img
              src={image}
              alt={title}
              className="w-full aspect-[4/3] object-contain"
            />
          </div>

          {/* Content */}
          <div className={`${imageOnLeft ? "lg:order-2" : "lg:order-1"}`}>
            <div className="p-8 lg:p-10">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-8">
                {title}
              </h2>
              <ul className="space-y-4">
                {items.map((item, index) => (
                  <li key={index} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-muted-foreground text-lg">{item}</span>
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
