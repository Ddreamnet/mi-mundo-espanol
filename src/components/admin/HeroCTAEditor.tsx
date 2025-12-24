import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Home, Megaphone } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageUpload } from "./ImageUpload";

interface HeroContent {
  mainTitle: string;
  subtitle: string;
  imageUrl: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
}

interface CTAContent {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
}

const defaultHero: HeroContent = {
  mainTitle: "Mi Mundo Español",
  subtitle: "Senin İspanyolca Dünyan",
  imageUrl: "/lovable-uploads/2da228c0-e8c3-4d4d-ae77-9eeca2c98996.png",
  primaryButtonText: "Hemen Başla",
  primaryButtonLink: "/iletisim",
  secondaryButtonText: "Dersler Hakkında",
  secondaryButtonLink: "/dersler",
};

const defaultCTA: CTAContent = {
  title: "Eğer Hazırsan Hemen Bilgi Al!",
  description: "İspanyolca öğrenme yolculuğuna bugün başla. Sana özel ders planları ve birebir eğitim ile hedeflerine ulaş.",
  buttonText: "İletişim",
  buttonLink: "https://wa.me/+905304721875",
};

export function HeroCTAEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [hero, setHero] = useState<HeroContent>(defaultHero);
  const [cta, setCTA] = useState<CTAContent>(defaultCTA);

  const { data: pageContents, isLoading } = useQuery({
    queryKey: ["page-contents", "hero", "cta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents")
        .select("*")
        .in("page_key", ["hero", "cta"]);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (pageContents) {
      const heroData = pageContents.find((p) => p.page_key === "hero");
      const ctaData = pageContents.find((p) => p.page_key === "cta");
      
      if (heroData?.content) {
        setHero({ ...defaultHero, ...(heroData.content as unknown as HeroContent) });
      }
      if (ctaData?.content) {
        setCTA({ ...defaultCTA, ...(ctaData.content as unknown as CTAContent) });
      }
    }
  }, [pageContents]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete existing then insert for hero
      await supabase.from("page_contents").delete().eq("page_key", "hero");
      const { error: heroError } = await supabase
        .from("page_contents")
        .insert({
          page_key: "hero",
          content: hero,
        } as any);
      if (heroError) throw heroError;

      await supabase.from("page_contents").delete().eq("page_key", "cta");
      const { error: ctaError } = await supabase
        .from("page_contents")
        .insert({
          page_key: "cta",
          content: cta,
        } as any);
      if (ctaError) throw ctaError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-contents"] });
      toast({ title: "Başarılı", description: "Hero ve CTA güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Hero Bölümü
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ana Başlık</Label>
              <Input
                value={hero.mainTitle}
                onChange={(e) => setHero({ ...hero, mainTitle: e.target.value })}
                placeholder="Mi Mundo Español"
              />
            </div>
            <div className="space-y-2">
              <Label>Alt Başlık</Label>
              <Input
                value={hero.subtitle}
                onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
                placeholder="Senin İspanyolca Dünyan"
              />
            </div>
          </div>

          <ImageUpload
            label="Hero Görseli"
            value={hero.imageUrl}
            onChange={(url) => setHero({ ...hero, imageUrl: url })}
            folder="hero"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Birincil Buton - Metin</Label>
              <Input
                value={hero.primaryButtonText}
                onChange={(e) => setHero({ ...hero, primaryButtonText: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Birincil Buton - Link</Label>
              <Input
                value={hero.primaryButtonLink}
                onChange={(e) => setHero({ ...hero, primaryButtonLink: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>İkincil Buton - Metin</Label>
              <Input
                value={hero.secondaryButtonText}
                onChange={(e) => setHero({ ...hero, secondaryButtonText: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>İkincil Buton - Link</Label>
              <Input
                value={hero.secondaryButtonLink}
                onChange={(e) => setHero({ ...hero, secondaryButtonLink: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA Section Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            CTA (Call to Action) Bölümü
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Başlık</Label>
            <Input
              value={cta.title}
              onChange={(e) => setCTA({ ...cta, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Açıklama</Label>
            <Textarea
              value={cta.description}
              onChange={(e) => setCTA({ ...cta, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Buton Metni</Label>
              <Input
                value={cta.buttonText}
                onChange={(e) => setCTA({ ...cta, buttonText: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Buton Linki</Label>
              <Input
                value={cta.buttonLink}
                onChange={(e) => setCTA({ ...cta, buttonLink: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Kaydediliyor..." : "Tümünü Kaydet"}
        </Button>
      </div>
    </div>
  );
}
