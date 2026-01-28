// ============================================================================
// DERS NOTU DÜZENLEME DİALOGU
// ============================================================================
// Ders notu başlık ve açıklamasını düzenlemeyi sağlar.

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EditLessonNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  batchId: string;
  currentTitle: string;
  currentDescription: string | null;
  onSuccess?: () => void;
}

export function EditLessonNoteDialog({ 
  open, 
  onOpenChange, 
  noteId,
  batchId,
  currentTitle,
  currentDescription,
  onSuccess 
}: EditLessonNoteDialogProps) {
  const [title, setTitle] = useState(currentTitle);
  const [description, setDescription] = useState(currentDescription || "");
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    setTitle(currentTitle);
    setDescription(currentDescription || "");
  }, [currentTitle, currentDescription, open]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: t("common.error"),
        description: t("dialogs.editLessonNote.titleRequired"),
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);

    try {
      const { error } = await supabase
        .from('lesson_notes')
        .update({
          title: title.trim(),
          description: description.trim() || null,
        })
        .eq('batch_id', batchId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("dialogs.editLessonNote.updateSuccess"),
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Update error:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.editLessonNote.updateError"),
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("dialogs.editLessonNote.title")}</DialogTitle>
          <DialogDescription>
            {t("dialogs.editLessonNote.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">{t("dialogs.editLessonNote.titleLabel")} *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("dialogs.editLessonNote.titlePlaceholder")}
              disabled={updating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">{t("dialogs.editLessonNote.descriptionLabel")}</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("dialogs.editLessonNote.descriptionPlaceholder")}
              rows={3}
              disabled={updating}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updating}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={updating}>
            {updating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                {t("common.updating")}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t("common.save")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
