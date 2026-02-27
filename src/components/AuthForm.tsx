import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Logo } from "./Logo";

export function AuthForm() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "student" as "teacher" | "student",
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(signInData.email, signInData.password);
      if (error) {
        toast({
          title: t("common.error"),
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signUp(signUpData.email, signUpData.password, signUpData.fullName, signUpData.role);
      if (error) {
        toast({
          title: t("common.error"),
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t("common.success"),
          description: t("auth.accountCreated"),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>

        <Card className="w-full border-border bg-card shadow-xl">
          <CardHeader className="text-center pb-2">
            <h2 className="text-xl font-semibold text-card-foreground">
              {isSignUp ? t("auth.signUp") : t("auth.signIn")}
            </h2>
          </CardHeader>
          <CardContent>
            {!isSignUp ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-card-foreground">{t("auth.email")}</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    required
                    className="bg-card border-border text-card-foreground placeholder:text-card-foreground/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-card-foreground">{t("auth.password")}</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder={t("auth.passwordPlaceholder")}
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    required
                    className="bg-card border-border text-card-foreground placeholder:text-card-foreground/50"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("auth.signIn")}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-card-foreground">{t("auth.fullName")}</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder={t("auth.namePlaceholder")}
                    value={signUpData.fullName}
                    onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                    required
                    className="bg-card border-border text-card-foreground placeholder:text-card-foreground/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-card-foreground">{t("auth.email")}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    required
                    className="bg-card border-border text-card-foreground placeholder:text-card-foreground/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-card-foreground">{t("auth.password")}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder={t("auth.passwordPlaceholder")}
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    required
                    className="bg-card border-border text-card-foreground placeholder:text-card-foreground/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-card-foreground">{t("auth.iAmA")}</Label>
                  <Select
                    value={signUpData.role}
                    onValueChange={(value: "teacher" | "student") => setSignUpData({ ...signUpData, role: value })}
                  >
                    <SelectTrigger className="bg-card border-border text-card-foreground">
                      <SelectValue placeholder={t("auth.selectRole")} />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-card-foreground">
                      <SelectItem value="student">{t("auth.student")}</SelectItem>
                      <SelectItem value="teacher">{t("auth.teacher")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("auth.signUp")}
                </Button>

                <div className="mt-4 text-center">
                  <p className="text-sm opacity-70">
                    {t("auth.alreadyHaveAccount")}{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className="text-primary hover:underline font-medium"
                    >
                      {t("auth.signIn")}
                    </button>
                  </p>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
