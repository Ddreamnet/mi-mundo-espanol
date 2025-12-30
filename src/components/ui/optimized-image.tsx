import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  aspectRatio?: string;
}

export function OptimizedImage({
  src,
  alt,
  className,
  containerClassName,
  priority = false,
  aspectRatio = "aspect-[4/3]",
}: OptimizedImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = src;

    if (img.complete) {
      setImageLoaded(true);
    }
  }, [src]);

  return (
    <div className={cn("relative w-full", aspectRatio, containerClassName)}>
      {!imageLoaded && (
        <div className="absolute inset-0 bg-muted/20 animate-pulse rounded-lg" />
      )}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className={cn(
          "w-full h-full object-contain transition-opacity duration-300",
          imageLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={() => setImageLoaded(true)}
      />
    </div>
  );
}
