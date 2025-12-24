import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: t("login.error"),
        description: t("login.emailPasswordRequired"),
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
        title: t("login.success"),
        description: t("login.successMessage"),
      });

      onOpenChange(false);
      setEmail("");
      setPassword("");
      
      // Redirect to home page after login to trigger role-based routing
      window.location.href = "/";
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = t("login.genericError");
      
      if (error.message === "Invalid login credentials") {
        errorMessage = t("login.invalidCredentials");
      } else if (error.message === "Email not confirmed") {
        errorMessage = t("login.emailNotConfirmed");
      }

      toast({
        title: t("login.loginFailed"),
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
            {t("login.title")}
          </DialogTitle>
          <DialogDescription className="text-card-foreground/70">
            {t("login.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-card-foreground">
              {t("login.email")}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t("login.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="bg-background/5 border-card-foreground/20 text-card-foreground placeholder:text-card-foreground/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-card-foreground">
              {t("login.password")}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t("login.passwordPlaceholder")}
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
                {t("login.loading")}
              </>
            ) : (
              t("login.submit")
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
