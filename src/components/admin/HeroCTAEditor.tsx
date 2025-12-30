import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Home, Megaphone, Copy } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageUpload } from "./ImageUpload";
import { LanguageTabs } from "./LanguageTabs";
import { useMultiLangContent, MultiLangContent } from "@/hooks/useMultiLangContent";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const queryClient = useQueryClient();

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

  const heroData = useMemo(() => {
    const found = pageContents?.find((p) => p.page_key === "hero");
    return found?.content as unknown as MultiLangContent<HeroContent> | HeroContent | null;
  }, [pageContents]);

  const ctaData = useMemo(() => {
    const found = pageContents?.find((p) => p.page_key === "cta");
    return found?.content as unknown as MultiLangContent<CTAContent> | CTAContent | null;
  }, [pageContents]);

  const {
    editingLang,
    setEditingLang,
    content: heroContent,
    currentContent: hero,
    updateField: updateHeroField,
    copyFromTurkish: copyHeroFromTurkish,
  } = useMultiLangContent(defaultHero, heroData);

  const {
    content: ctaContent,
    currentContent: cta,
    updateField: updateCTAField,
    copyFromTurkish: copyCTAFromTurkish,
  } = useMultiLangContent(defaultCTA, ctaData);

  // Sync editing lang between hero and cta
  const [syncedEditingLang, setSyncedEditingLang] = useState(editingLang);
  useEffect(() => {
    setEditingLang(syncedEditingLang);
  }, [syncedEditingLang, setEditingLang]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete existing then insert for hero
      await supabase.from("page_contents").delete().eq("page_key", "hero");
      const { error: heroError } = await supabase
        .from("page_contents")
        .insert({
          page_key: "hero",
          content: heroContent,
        } as any);
      if (heroError) throw heroError;

      await supabase.from("page_contents").delete().eq("page_key", "cta");
      const { error: ctaError } = await supabase
        .from("page_contents")
        .insert({
          page_key: "cta",
          content: ctaContent,
        } as any);
      if (ctaError) throw ctaError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-contents"] });
      toast({ title: t("common.success"), description: "Hero ve CTA güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const handleCopyAll = () => {
    copyHeroFromTurkish();
    copyCTAFromTurkish();
    toast({ title: t("common.copied"), description: "Türkçe içerik kopyalandı" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Language Tabs */}
      <LanguageTabs selectedLang={syncedEditingLang} onLanguageChange={setSyncedEditingLang} />

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
                onChange={(e) => updateHeroField("mainTitle", e.target.value)}
                placeholder="Mi Mundo Español"
              />
            </div>
            <div className="space-y-2">
              <Label>Alt Başlık</Label>
              <Input
                value={hero.subtitle}
                onChange={(e) => updateHeroField("subtitle", e.target.value)}
                placeholder="Senin İspanyolca Dünyan"
              />
            </div>
          </div>

          {syncedEditingLang === "tr" && (
            <ImageUpload
              label="Hero Görseli"
              value={hero.imageUrl}
              onChange={(url) => updateHeroField("imageUrl", url)}
              folder="hero"
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Birincil Buton - Metin</Label>
              <Input
                value={hero.primaryButtonText}
                onChange={(e) => updateHeroField("primaryButtonText", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Birincil Buton - Link</Label>
              <Input
                value={hero.primaryButtonLink}
                onChange={(e) => updateHeroField("primaryButtonLink", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>İkincil Buton - Metin</Label>
              <Input
                value={hero.secondaryButtonText}
                onChange={(e) => updateHeroField("secondaryButtonText", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>İkincil Buton - Link</Label>
              <Input
                value={hero.secondaryButtonLink}
                onChange={(e) => updateHeroField("secondaryButtonLink", e.target.value)}
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
              onChange={(e) => updateCTAField("title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Açıklama</Label>
            <Textarea
              value={cta.description}
              onChange={(e) => updateCTAField("description", e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Buton Metni</Label>
              <Input
                value={cta.buttonText}
                onChange={(e) => updateCTAField("buttonText", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Buton Linki</Label>
              <Input
                value={cta.buttonLink}
                onChange={(e) => updateCTAField("buttonLink", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  );
}
