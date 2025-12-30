import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface UploadHomeworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  teacherId: string;
  onSuccess?: () => void;
  uploadedByUserId?: string; // Kim yüklüyor (öğrenci veya öğretmen)
}

export function UploadHomeworkDialog({ 
  open, 
  onOpenChange, 
  studentId, 
  teacherId,
  uploadedByUserId,
  onSuccess 
}: UploadHomeworkDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
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
            description: `${file.name} ${t("dialogs.uploadHomework.fileTooLarge")}`,
            variant: "destructive",
          });
          continue;
        }
        validFiles.push(file);
      }
      
      setFiles(prev => [...prev, ...validFiles]);
    }
    
    // Reset input to allow selecting same file again
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: t("common.error"),
        description: t("dialogs.uploadHomework.titleRequired"),
        variant: "destructive",
      });
      return;
    }

    if (files.length === 0) {
      toast({
        title: t("common.error"),
        description: t("dialogs.uploadHomework.selectFile"),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const batchId = crypto.randomUUID();
      const uploaderId = uploadedByUserId || studentId;
      const submissions = [];

      // Upload all files
      for (const file of files) {
        // Upload file to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${studentId}/${uploaderId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('homework-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Store the file path (not public URL) since bucket is private
        // We'll generate signed URLs when displaying/downloading
        const fileUrl = `homework-files/${filePath}`;

        submissions.push({
          batch_id: batchId,
          student_id: studentId,
          teacher_id: teacherId,
          title: title.trim(),
          description: description.trim() || null,
          file_url: fileUrl,
          file_type: file.type,
          file_name: file.name,
          uploaded_by_user_id: uploaderId,
        });
      }

      // Create homework submission records
      const { error: insertError } = await supabase
        .from('homework_submissions')
        .insert(submissions);

      if (insertError) throw insertError;

      toast({
        title: t("common.success"),
        description: `${files.length} ${t("dialogs.uploadHomework.filesUploaded")}`,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setFiles([]);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.uploadHomework.uploadError"),
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
          <DialogTitle>{t("dialogs.uploadHomework.title")}</DialogTitle>
          <DialogDescription>
            {t("dialogs.uploadHomework.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("dialogs.uploadHomework.titleLabel")} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("dialogs.uploadHomework.titlePlaceholder")}
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("dialogs.uploadHomework.descriptionLabel")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("dialogs.uploadHomework.descriptionPlaceholder")}
              rows={3}
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("dialogs.uploadHomework.filesLabel")} *</Label>
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
            <p className="text-xs opacity-60">
              {t("dialogs.uploadHomework.supportedFormats")}
            </p>
          </div>
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