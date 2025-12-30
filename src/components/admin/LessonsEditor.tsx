import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Save, BookOpen, Plus, X, Copy } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LanguageTabs } from "./LanguageTabs";
import { useMultiLangContent, MultiLangContent } from "@/hooks/useMultiLangContent";

interface LessonsContent {
  pageTitle: string;
  pageSubtitle: string;
  individualTitle: string;
  individualFeatures: string[];
  groupTitle: string;
  groupFeatures: string[];
  contactTitle: string;
  phone: string;
  email: string;
}

const defaultLessons: LessonsContent = {
  pageTitle: "Ders Programlarımız",
  pageSubtitle: "İhtiyaçlarınıza uygun ders seçeneğini keşfedin",
  individualTitle: "Bireysel",
  individualFeatures: [
    "40 dakikalık birebir ders",
    "Ücretsiz deneme dersi (seviye belirleme + içerik tanıtımı)",
    "Kişiye özel program (seviye, hedef ve öğrenme hızına göre)",
    "Esnek ders saatleriyle planlama",
    "Aula Internacional + gerekli ek materyallerin sağlanması",
    "Konuşma odaklı ders (akıcılık + telaffuz çalışmaları)",
    "Seviyeye uygun dil bilgisi anlatımı (örneklerle)",
    "Tema bazlı kelime çalışmaları",
    "Düzenli ödevlendirme ve geri bildirim",
    "Aylık ilerleme raporu",
    "Ders takibi",
    "Kur sonu sınavını başarıyla tamamlayanlara başarı sertifikası",
  ],
  groupTitle: "Grup",
  groupFeatures: [
    "40 dakikalık canlı grup dersleri",
    "Seviyeye göre küçük gruplar (max 5)",
    "Kurs öncesi seviye tespiti",
    "Seviye bazlı sınıflar (A1–A2–B1–B2)",
    "Aula Internacional ile yapılandırılmış müfredat",
    "Grup içi konuşma pratiği (diyaloglar + etkileşim)",
    "Grup seviyesine uygun dil bilgisi anlatımı",
    "Tema bazlı kelime çalışmaları",
    "Grup düzeyine uygun ödevlendirme",
    "Ödev kontrolü + genel geri bildirim",
    "Kur sonunda başarı sertifikası",
  ],
  contactTitle: "Ücretlendirme için iletişim",
  phone: "+90 555 123 45 67",
  email: "info@mimundoespanol.com",
};

export function LessonsEditor() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [newIndividualItem, setNewIndividualItem] = useState("");
  const [newGroupItem, setNewGroupItem] = useState("");

  const { data: pageContent, isLoading } = useQuery({
    queryKey: ["page-contents", "lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents")
        .select("*")
        .eq("page_key", "lessons")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const savedContent = useMemo(() => {
    return pageContent?.content as unknown as MultiLangContent<LessonsContent> | LessonsContent | null;
  }, [pageContent]);

  const {
    editingLang,
    setEditingLang,
    content,
    currentContent,
    updateContent,
    copyFromTurkish,
  } = useMultiLangContent(defaultLessons, savedContent);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("page_contents").delete().eq("page_key", "lessons");
      const { error } = await supabase
        .from("page_contents")
        .insert({
          page_key: "lessons",
          content: content,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-contents"] });
      toast({ title: t("common.success"), description: "Dersler sayfası güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const addFeature = (type: "individual" | "group") => {
    if (type === "individual" && newIndividualItem.trim()) {
      updateContent({
        ...currentContent,
        individualFeatures: [...currentContent.individualFeatures, newIndividualItem.trim()],
      });
      setNewIndividualItem("");
    } else if (type === "group" && newGroupItem.trim()) {
      updateContent({
        ...currentContent,
        groupFeatures: [...currentContent.groupFeatures, newGroupItem.trim()],
      });
      setNewGroupItem("");
    }
  };

  const removeFeature = (type: "individual" | "group", index: number) => {
    if (type === "individual") {
      updateContent({
        ...currentContent,
        individualFeatures: currentContent.individualFeatures.filter((_, i) => i !== index),
      });
    } else {
      updateContent({
        ...currentContent,
        groupFeatures: currentContent.groupFeatures.filter((_, i) => i !== index),
      });
    }
  };

  const updateFeature = (type: "individual" | "group", index: number, value: string) => {
    if (type === "individual") {
      const updated = [...currentContent.individualFeatures];
      updated[index] = value;
      updateContent({ ...currentContent, individualFeatures: updated });
    } else {
      const updated = [...currentContent.groupFeatures];
      updated[index] = value;
      updateContent({ ...currentContent, groupFeatures: updated });
    }
  };

  const handleCopyFromTurkish = () => {
    copyFromTurkish();
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
      <LanguageTabs selectedLang={editingLang} onLanguageChange={setEditingLang} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Sayfa Başlığı
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ana Başlık</Label>
              <Input
                value={currentContent.pageTitle}
                onChange={(e) => updateContent({ ...currentContent, pageTitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Alt Başlık</Label>
              <Input
                value={currentContent.pageSubtitle}
                onChange={(e) => updateContent({ ...currentContent, pageSubtitle: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bireysel */}
        <Card>
          <CardHeader>
            <CardTitle>Bireysel Ders Özellikleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentContent.individualFeatures.map((feature, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={feature}
                  onChange={(e) => updateFeature("individual", index, e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFeature("individual", index)}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newIndividualItem}
                onChange={(e) => setNewIndividualItem(e.target.value)}
                placeholder="Yeni özellik ekle..."
                onKeyDown={(e) => e.key === "Enter" && addFeature("individual")}
              />
              <Button variant="outline" size="icon" onClick={() => addFeature("individual")}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grup */}
        <Card>
          <CardHeader>
            <CardTitle>Grup Ders Özellikleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentContent.groupFeatures.map((feature, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={feature}
                  onChange={(e) => updateFeature("group", index, e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFeature("group", index)}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newGroupItem}
                onChange={(e) => setNewGroupItem(e.target.value)}
                placeholder="Yeni özellik ekle..."
                onKeyDown={(e) => e.key === "Enter" && addFeature("group")}
              />
              <Button variant="outline" size="icon" onClick={() => addFeature("group")}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>İletişim Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>İletişim Başlığı</Label>
              <Input
                value={currentContent.contactTitle}
                onChange={(e) => updateContent({ ...currentContent, contactTitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input
                value={currentContent.phone}
                onChange={(e) => updateContent({ ...currentContent, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input
                value={currentContent.email}
                onChange={(e) => updateContent({ ...currentContent, email: e.target.value })}
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
