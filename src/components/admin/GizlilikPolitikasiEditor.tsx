import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Plus, Trash2, GripVertical, Shield, Copy } from "lucide-react";
import { LanguageTabs } from "./LanguageTabs";
import { useMultiLangContent, MultiLangContent } from "@/hooks/useMultiLangContent";

interface PolicySection {
  title: string;
  content: string;
}

interface PrivacyContent {
  pageTitle: string;
  pageSubtitle: string;
  lastUpdated: string;
  sections: PolicySection[];
}

const defaultPrivacy: PrivacyContent = {
  pageTitle: "Gizlilik Politikası",
  pageSubtitle: "Kişisel verilerinizin korunması bizim için önemlidir",
  lastUpdated: new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }),
  sections: [],
};

export function GizlilikPolitikasiEditor() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: pageContent, isLoading } = useQuery({
    queryKey: ["page-content", "gizlilik-politikasi"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents")
        .select("*")
        .eq("page_key", "gizlilik-politikasi")
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const savedContent = useMemo(() => {
    return pageContent?.content as unknown as MultiLangContent<PrivacyContent> | PrivacyContent | null;
  }, [pageContent]);

  const {
    editingLang,
    setEditingLang,
    content,
    currentContent: formData,
    updateContent,
    copyFromTurkish,
  } = useMultiLangContent(defaultPrivacy, savedContent);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Update lastUpdated for all languages
      const updatedContent = {
        tr: { ...content.tr, lastUpdated: new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) },
        en: { ...content.en, lastUpdated: new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) },
        es: { ...content.es, lastUpdated: new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) },
      };
      
      const jsonContent = JSON.parse(JSON.stringify(updatedContent));
      if (pageContent?.id) {
        const { error } = await supabase
          .from("page_contents")
          .update({ content: jsonContent, updated_at: new Date().toISOString() })
          .eq("id", pageContent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("page_contents")
          .insert([{ page_key: "gizlilik-politikasi", content: jsonContent }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-content", "gizlilik-politikasi"] });
      toast.success(t("editors.privacy.pageUpdated"));
    },
    onError: () => {
      toast.error(t("editors.privacy.saveFailed"));
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const addSection = () => {
    updateContent({
      ...formData,
      sections: [...formData.sections, { title: "", content: "" }],
    });
  };

  const removeSection = (index: number) => {
    updateContent({
      ...formData,
      sections: formData.sections.filter((_, i) => i !== index),
    });
  };

  const updateSection = (index: number, field: keyof PolicySection, value: string) => {
    const newSections = [...formData.sections];
    newSections[index] = { ...newSections[index], [field]: value };
    updateContent({ ...formData, sections: newSections });
  };

  const handleCopyFromTurkish = () => {
    copyFromTurkish();
    toast.success(t("common.copied"));
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Language Tabs */}
      <div className="flex items-center justify-between">
        <LanguageTabs selectedLang={editingLang} onLanguageChange={setEditingLang} />
        {editingLang !== "tr" && (
          <Button variant="outline" size="sm" onClick={handleCopyFromTurkish}>
            <Copy className="h-4 w-4 mr-2" />
            {t("common.copyFromTurkish")}
          </Button>
        )}
      </div>

      {/* Page Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("dialogs.pageSettings")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("editors.privacy.pageTitle")}</Label>
              <Input
                value={formData.pageTitle}
                onChange={(e) => updateContent({ ...formData, pageTitle: e.target.value })}
                placeholder={t("editors.privacy.pageTitlePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("editors.privacy.subtitle")}</Label>
              <Input
                value={formData.pageSubtitle}
                onChange={(e) => updateContent({ ...formData, pageSubtitle: e.target.value })}
                placeholder={t("editors.privacy.subtitlePlaceholder")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("editors.privacy.lastUpdated")}</Label>
            <Input
              value={formData.lastUpdated}
              onChange={(e) => updateContent({ ...formData, lastUpdated: e.target.value })}
              placeholder={t("editors.privacy.lastUpdatedPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("editors.privacy.autoUpdateNote")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Policy Sections */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t("editors.privacy.sections")} ({formData.sections.length})</CardTitle>
            <Button onClick={addSection} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              {t("editors.privacy.addSection")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.sections.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("editors.privacy.noSections")}
            </p>
          ) : (
            formData.sections.map((section, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 space-y-3 bg-muted/30"
              >
                <div className="flex items-start gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                  <div className="flex-1 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm">{t("editors.privacy.sectionTitle")} {index + 1}</Label>
                      <Input
                        value={section.title}
                        onChange={(e) => updateSection(index, "title", e.target.value)}
                        placeholder={t("editors.privacy.sectionTitlePlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">{t("editors.privacy.content")}</Label>
                      <Textarea
                        value={section.content}
                        onChange={(e) => updateSection(index, "content", e.target.value)}
                        placeholder={t("editors.privacy.contentPlaceholder")}
                        rows={4}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSection(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  );
}
