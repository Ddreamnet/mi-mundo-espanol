import logoImg from "@/assets/logo.png";
import brandNameImg from "@/assets/brand-name.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showBrandName?: boolean;
}

export function Logo({ className = "", size = "md", showBrandName = true }: LogoProps) {
  const sizeClasses = {
    sm: "h-8",
    md: "h-10",
    lg: "h-12",
  };

  const brandSizeClasses = {
    sm: "h-5",
    md: "h-6",
    lg: "h-8",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={logoImg} 
        alt="Logo" 
        className={`${sizeClasses[size]} w-auto object-contain`} 
      />
      {showBrandName && (
        <img 
          src={brandNameImg} 
          alt="Mi Mundo Español" 
          className={`${brandSizeClasses[size]} w-auto object-contain`} 
        />
      )}
    </div>
  );
}
