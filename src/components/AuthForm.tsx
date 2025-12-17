import { useState } from "react";
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
          title: "Hata",
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
          title: "Hata",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Başarılı",
          description: "Hesap başarıyla oluşturuldu! Şimdi giriş yapabilirsiniz.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo centered above card */}
        <div className="flex justify-center">
          <Logo size="lg" showBrandName={true} />
        </div>

        <Card className="w-full border-border bg-card shadow-xl">
          <CardHeader className="text-center pb-2">
            <h2 className="text-xl font-semibold text-foreground">
              {isSignUp ? "Kayıt Ol" : "Giriş Yap"}
            </h2>
          </CardHeader>
          <CardContent>
            {!isSignUp ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-foreground">E-posta</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="E-posta adresinizi girin"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    required
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-foreground">Şifre</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Şifrenizi girin"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    required
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Giriş Yap
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-foreground">Ad Soyad</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Ad ve soyadınızı girin"
                    value={signUpData.fullName}
                    onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                    required
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-foreground">E-posta</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="E-posta adresinizi girin"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    required
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-foreground">Şifre</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Şifrenizi girin"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    required
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-foreground">Ben bir...</Label>
                  <Select
                    value={signUpData.role}
                    onValueChange={(value: "teacher" | "student") => setSignUpData({ ...signUpData, role: value })}
                  >
                    <SelectTrigger className="bg-muted border-border text-foreground">
                      <SelectValue placeholder="Rolünüzü seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="student">Öğrenci</SelectItem>
                      <SelectItem value="teacher">Öğretmen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Kayıt Ol
                </Button>

                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Zaten hesabınız var mı?{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className="text-primary hover:underline font-medium"
                    >
                      Giriş Yap
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
