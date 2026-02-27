import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ className, fullScreen = false }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className={cn("animate-spin rounded-full h-8 w-8 border-b-2 border-primary", className)} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8">
      <div className={cn("animate-spin rounded-full h-8 w-8 border-b-2 border-primary", className)} />
    </div>
  );
}
