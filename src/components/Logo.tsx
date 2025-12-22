import logoFullImg from "@/assets/logo-full.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Logo({ className = "", size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "h-8",
    md: "h-10",
    lg: "h-12",
    xl: "h-14",
  };

  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src={logoFullImg} 
        alt="Mi Mundo Español" 
        className={`${sizeClasses[size]} w-auto object-contain`} 
      />
    </div>
  );
}
