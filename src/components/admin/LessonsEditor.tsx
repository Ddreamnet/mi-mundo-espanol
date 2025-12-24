import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, BookOpen, Plus, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();

  const [content, setContent] = useState<LessonsContent>(defaultLessons);
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

  useEffect(() => {
    if (pageContent?.content) {
      setContent({ ...defaultLessons, ...(pageContent.content as unknown as LessonsContent) });
    }
  }, [pageContent]);

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
      toast({ title: "Başarılı", description: "Dersler sayfası güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const addFeature = (type: "individual" | "group") => {
    if (type === "individual" && newIndividualItem.trim()) {
      setContent({
        ...content,
        individualFeatures: [...content.individualFeatures, newIndividualItem.trim()],
      });
      setNewIndividualItem("");
    } else if (type === "group" && newGroupItem.trim()) {
      setContent({
        ...content,
        groupFeatures: [...content.groupFeatures, newGroupItem.trim()],
      });
      setNewGroupItem("");
    }
  };

  const removeFeature = (type: "individual" | "group", index: number) => {
    if (type === "individual") {
      setContent({
        ...content,
        individualFeatures: content.individualFeatures.filter((_, i) => i !== index),
      });
    } else {
      setContent({
        ...content,
        groupFeatures: content.groupFeatures.filter((_, i) => i !== index),
      });
    }
  };

  const updateFeature = (type: "individual" | "group", index: number, value: string) => {
    if (type === "individual") {
      const updated = [...content.individualFeatures];
      updated[index] = value;
      setContent({ ...content, individualFeatures: updated });
    } else {
      const updated = [...content.groupFeatures];
      updated[index] = value;
      setContent({ ...content, groupFeatures: updated });
    }
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
                value={content.pageTitle}
                onChange={(e) => setContent({ ...content, pageTitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Alt Başlık</Label>
              <Input
                value={content.pageSubtitle}
                onChange={(e) => setContent({ ...content, pageSubtitle: e.target.value })}
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
            {content.individualFeatures.map((feature, index) => (
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
            {content.groupFeatures.map((feature, index) => (
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
                value={content.contactTitle}
                onChange={(e) => setContent({ ...content, contactTitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input
                value={content.phone}
                onChange={(e) => setContent({ ...content, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input
                value={content.email}
                onChange={(e) => setContent({ ...content, email: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </div>
  );
}
