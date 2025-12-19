import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Hata",
        description: "E-posta ve şifre gereklidir.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Başarılı",
        description: "Giriş yapıldı. Yönlendiriliyorsunuz...",
      });

      onOpenChange(false);
      setEmail("");
      setPassword("");
      
      // The app will automatically redirect based on the user's role
      // because of the useAuth hook in App.tsx
      window.location.reload();
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "Giriş yapılırken bir hata oluştu.";
      
      if (error.message === "Invalid login credentials") {
        errorMessage = "E-posta veya şifre hatalı.";
      } else if (error.message === "Email not confirmed") {
        errorMessage = "E-posta adresiniz henüz doğrulanmamış.";
      }

      toast({
        title: "Giriş Başarısız",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-card-foreground">
            Giriş Yap
          </DialogTitle>
          <DialogDescription className="text-card-foreground/70">
            Mi Mundo Español hesabınıza giriş yapın
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-card-foreground">
              E-posta
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="ornek@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="bg-background/5 border-card-foreground/20 text-card-foreground placeholder:text-card-foreground/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-card-foreground">
              Şifre
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="bg-background/5 border-card-foreground/20 text-card-foreground placeholder:text-card-foreground/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-card-foreground/50 hover:text-card-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[hsl(var(--background))] text-foreground hover:bg-[hsl(var(--background)/0.9)]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Giriş yapılıyor...
              </>
            ) : (
              "Giriş Yap"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
