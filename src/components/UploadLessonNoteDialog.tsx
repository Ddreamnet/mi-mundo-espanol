// ============================================================================
// DERS NOTU YÜKLEME DİALOGU
// ============================================================================
// Öğretmenlerin ders notu yüklemesini sağlar.

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Link as LinkIcon, FileUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UploadLessonNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  teacherId: string;
  onSuccess?: () => void;
}

export function UploadLessonNoteDialog({ 
  open, 
  onOpenChange, 
  studentId, 
  teacherId,
  onSuccess 
}: UploadLessonNoteDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [link, setLink] = useState("");
  const [uploadType, setUploadType] = useState<"file" | "link">("link");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const acceptedFileTypes = "image/jpeg,image/jpg,image/png,image/webp,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      const validFiles: File[] = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: t("common.error"),
            description: `${file.name} ${t("dialogs.uploadLessonNote.fileTooLarge")}`,
            variant: "destructive",
          });
          continue;
        }
        validFiles.push(file);
      }
      
      setFiles(prev => [...prev, ...validFiles]);
    }
    
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: t("common.error"),
        description: t("dialogs.uploadLessonNote.titleRequired"),
        variant: "destructive",
      });
      return;
    }

    if (uploadType === "file" && files.length === 0) {
      toast({
        title: t("common.error"),
        description: t("dialogs.uploadLessonNote.selectFile"),
        variant: "destructive",
      });
      return;
    }

    if (uploadType === "link" && !link.trim()) {
      toast({
        title: t("common.error"),
        description: t("dialogs.uploadLessonNote.linkRequired"),
        variant: "destructive",
      });
      return;
    }

    if (uploadType === "link" && !isValidUrl(link.trim())) {
      toast({
        title: t("common.error"),
        description: t("dialogs.uploadLessonNote.invalidLink"),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const batchId = crypto.randomUUID();
      const submissions = [];

      if (uploadType === "link") {
        submissions.push({
          batch_id: batchId,
          student_id: studentId,
          teacher_id: teacherId,
          title: title.trim(),
          description: description.trim() || null,
          file_url: link.trim(),
          file_type: "link",
          file_name: link.trim(),
        });
      } else {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${studentId}/${teacherId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('lesson-notes')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const fileUrl = `lesson-notes/${filePath}`;

          submissions.push({
            batch_id: batchId,
            student_id: studentId,
            teacher_id: teacherId,
            title: title.trim(),
            description: description.trim() || null,
            file_url: fileUrl,
            file_type: file.type,
            file_name: file.name,
          });
        }
      }

      const { error: insertError } = await supabase
        .from('lesson_notes')
        .insert(submissions);

      if (insertError) throw insertError;

      const successMessage = uploadType === "link" 
        ? t("dialogs.uploadLessonNote.linkUploaded")
        : `${files.length} ${t("dialogs.uploadLessonNote.filesUploaded")}`;

      toast({
        title: t("common.success"),
        description: successMessage,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setFiles([]);
      setLink("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.uploadLessonNote.uploadError"),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("dialogs.uploadLessonNote.title")}</DialogTitle>
          <DialogDescription>
            {t("dialogs.uploadLessonNote.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("dialogs.uploadLessonNote.titleLabel")} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("dialogs.uploadLessonNote.titlePlaceholder")}
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("dialogs.uploadLessonNote.descriptionLabel")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("dialogs.uploadLessonNote.descriptionPlaceholder")}
              rows={3}
              disabled={uploading}
            />
          </div>

          <Tabs value={uploadType} onValueChange={(v) => setUploadType(v as "file" | "link")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                {t("dialogs.uploadLessonNote.linkTab")}
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center gap-2">
                <FileUp className="h-4 w-4" />
                {t("dialogs.uploadLessonNote.fileTab")}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="link" className="space-y-2 mt-4">
              <Label htmlFor="link">{t("dialogs.uploadLessonNote.linkLabel")} *</Label>
              <Input
                id="link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder={t("dialogs.uploadLessonNote.linkPlaceholder")}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                {t("dialogs.uploadLessonNote.linkDescription")}
              </p>
            </TabsContent>
            
            <TabsContent value="file" className="space-y-2 mt-4">
              <Label>{t("dialogs.uploadLessonNote.filesLabel")} *</Label>
              <Input
                type="file"
                accept={acceptedFileTypes}
                onChange={handleFileChange}
                disabled={uploading}
                className="cursor-pointer"
                multiple
              />
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm opacity-70 bg-muted/50 p-2 rounded">
                      <span className="flex-1 truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFile(index)}
                        disabled={uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t("dialogs.uploadLessonNote.supportedFormats")}
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={uploading}>
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                {t("common.uploading")}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t("common.upload")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
