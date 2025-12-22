import logoFullImg from "@/assets/logo-full.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Logo({ className = "", size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "h-10",
    md: "h-12",
    lg: "h-14",
    xl: "h-16",
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
