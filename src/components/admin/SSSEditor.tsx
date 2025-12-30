import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Plus, Trash2, GripVertical, HelpCircle, Copy } from "lucide-react";
import { LanguageTabs } from "./LanguageTabs";
import { useMultiLangContent, MultiLangContent } from "@/hooks/useMultiLangContent";

interface FAQItem {
  question: string;
  answer: string;
}

interface SSSContent {
  pageTitle: string;
  pageSubtitle: string;
  items: FAQItem[];
}

const defaultSSS: SSSContent = {
  pageTitle: "Sıkça Sorulan Sorular",
  pageSubtitle: "En çok merak edilen sorular ve cevapları",
  items: [],
};

export function SSSEditor() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: pageContent, isLoading } = useQuery({
    queryKey: ["page-content", "sss"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents")
        .select("*")
        .eq("page_key", "sss")
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const savedContent = useMemo(() => {
    return pageContent?.content as unknown as MultiLangContent<SSSContent> | SSSContent | null;
  }, [pageContent]);

  const {
    editingLang,
    setEditingLang,
    content,
    currentContent: formData,
    updateContent,
    copyFromTurkish,
  } = useMultiLangContent(defaultSSS, savedContent);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const jsonContent = JSON.parse(JSON.stringify(content));
      if (pageContent?.id) {
        const { error } = await supabase
          .from("page_contents")
          .update({ content: jsonContent, updated_at: new Date().toISOString() })
          .eq("id", pageContent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("page_contents")
          .insert([{ page_key: "sss", content: jsonContent }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-content", "sss"] });
      toast.success(t("editors.sss.pageUpdated"));
    },
    onError: () => {
      toast.error(t("editors.sss.saveFailed"));
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const addItem = () => {
    updateContent({
      ...formData,
      items: [...formData.items, { question: "", answer: "" }],
    });
  };

  const removeItem = (index: number) => {
    updateContent({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: keyof FAQItem, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateContent({ ...formData, items: newItems });
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
      <LanguageTabs selectedLang={editingLang} onLanguageChange={setEditingLang} />

      {/* Page Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {t("dialogs.pageSettings")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("editors.sss.pageTitle")}</Label>
              <Input
                value={formData.pageTitle}
                onChange={(e) => updateContent({ ...formData, pageTitle: e.target.value })}
                placeholder={t("editors.sss.pageTitlePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("editors.sss.subtitle")}</Label>
              <Input
                value={formData.pageSubtitle}
                onChange={(e) => updateContent({ ...formData, pageSubtitle: e.target.value })}
                placeholder={t("editors.sss.subtitlePlaceholder")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t("editors.sss.questions")} ({formData.items.length})</CardTitle>
            <Button onClick={addItem} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              {t("editors.sss.addQuestion")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("editors.sss.noQuestions")}
            </p>
          ) : (
            formData.items.map((item, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 space-y-3 bg-muted/30"
              >
                <div className="flex items-start gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                  <div className="flex-1 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm">{t("editors.sss.question")} {index + 1}</Label>
                      <Input
                        value={item.question}
                        onChange={(e) => updateItem(index, "question", e.target.value)}
                        placeholder={t("editors.sss.questionPlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">{t("editors.sss.answer")}</Label>
                      <Textarea
                        value={item.answer}
                        onChange={(e) => updateItem(index, "answer", e.target.value)}
                        placeholder={t("editors.sss.answerPlaceholder")}
                        rows={3}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
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
