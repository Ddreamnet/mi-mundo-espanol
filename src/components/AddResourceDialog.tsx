import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AddResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId?: string;
  onResourceAdded?: () => void;
  onAddResource?: (title: string, description: string, resourceType: string, resourceUrl: string) => Promise<void>;
  topicTitle?: string;
}

export function AddResourceDialog({
  open,
  onOpenChange,
  topicId,
  onResourceAdded,
  onAddResource,
  topicTitle,
}: AddResourceDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const resourceTypes = [
    { value: "pdf", label: t("dialogs.addResource.types.pdf") },
    { value: "video", label: t("dialogs.addResource.types.video") },
    { value: "image", label: t("dialogs.addResource.types.image") },
    { value: "link", label: t("dialogs.addResource.types.link") },
    { value: "document", label: t("dialogs.addResource.types.document") },
    { value: "other", label: t("dialogs.addResource.types.other") },
  ];

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const file = files[0];
        setSelectedFile(file);

        // Auto-detect resource type based on file extension
        const extension = file.name.split(".").pop()?.toLowerCase();
        if (extension === "pdf") {
          setResourceType("pdf");
        } else if (["mp4", "avi", "mov", "wmv"].includes(extension || "")) {
          setResourceType("video");
        } else if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(extension || "")) {
          setResourceType("image");
        } else if (["doc", "docx", "txt", "rtf", "pptx", "ppt"].includes(extension || "")) {
          setResourceType("document");
        } else {
          setResourceType("other");
        }

        // Auto-fill title with filename (without extension)
        if (!title) {
          const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
          setTitle(nameWithoutExtension);
        }
      }
    },
    [title],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);

      // Auto-detect resource type based on file extension
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension === "pdf") {
        setResourceType("pdf");
      } else if (["mp4", "avi", "mov", "wmv"].includes(extension || "")) {
        setResourceType("video");
      } else if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(extension || "")) {
        setResourceType("image");
      } else if (["doc", "docx", "txt", "rtf", "pptx", "ppt"].includes(extension || "")) {
        setResourceType("document");
      } else {
        setResourceType("other");
      }

      // Auto-fill title with filename (without extension)
      if (!title) {
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExtension);
      }
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${topicId || "global"}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("learning-resources").upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("learning-resources").getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !resourceType) return;

    // Check if URL is required for web links
    if (resourceType === "link" && !webUrl.trim() && !selectedFile) {
      toast({
        title: t("common.error"),
        description: t("dialogs.addResource.urlRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      let resourceUrl = "";

      if (selectedFile) {
        // Upload file to Supabase storage
        resourceUrl = await uploadFile(selectedFile);
      } else if (resourceType === "link" && webUrl.trim()) {
        // Use the provided web URL
        resourceUrl = webUrl.trim();
      } else if (onAddResource) {
        // For global topics, we might not require file upload
        resourceUrl = "placeholder"; // Will be replaced by actual URL in the callback
      }

      if (onAddResource) {
        // Global resources mode
        await onAddResource(title.trim(), description.trim(), resourceType, resourceUrl);
      } else {
        // Student-specific resources mode
        if (!topicId) return;

        // Get the next order index
        const { data: existingResources } = await supabase
          .from("resources")
          .select("order_index")
          .eq("topic_id", topicId)
          .order("order_index", { ascending: false })
          .limit(1);

        const nextOrderIndex =
          existingResources && existingResources.length > 0 ? existingResources[0].order_index + 1 : 0;

        const { error } = await supabase.from("resources").insert({
          topic_id: topicId,
          title: title.trim(),
          description: description.trim() || null,
          resource_type: resourceType,
          resource_url: resourceUrl,
          order_index: nextOrderIndex,
        });

        if (error) throw error;

        toast({
          title: t("common.success"),
          description: t("dialogs.addResource.successMessage"),
        });

        onResourceAdded?.();
      }

      setTitle("");
      setDescription("");
      setResourceType("");
      setWebUrl("");
      setSelectedFile(null);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDialogDescription = () => {
    let desc = topicTitle
      ? t("dialogs.addResource.topicDescription", { topic: topicTitle })
      : t("dialogs.addResource.topicDescriptionDefault");
    return desc + " " + t("dialogs.addResource.topicDescriptionDetails");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogs.addResource.title")}</DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-full overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="resource-title">{t("dialogs.addResource.titleLabel")}</Label>
            <Input
              id="resource-title"
              placeholder={t("dialogs.addResource.titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-type">{t("dialogs.addResource.typeLabel")}</Label>
            <Select value={resourceType} onValueChange={setResourceType} required>
              <SelectTrigger>
                <SelectValue placeholder={t("dialogs.addResource.typePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {resourceTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {resourceType === "link" && (
            <div className="space-y-2">
              <Label htmlFor="web-url">{t("dialogs.addResource.urlLabel")}</Label>
              <Input
                id="web-url"
                type="url"
                placeholder={t("dialogs.addResource.urlPlaceholder")}
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                required={resourceType === "link" && !selectedFile}
              />
            </div>
          )}

          {resourceType !== "link" && (
            <div className="space-y-2">
              <Label>{t("dialogs.addResource.fileUpload")}</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors w-full max-w-full box-border ${
                  isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm truncate">{selectedFile.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 opacity-50 mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm opacity-70">
                        {t("dialogs.addResource.dragDrop")}
                      </p>
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.pptx,.ppt,.txt,.mp4,.avi,.mov,.wmv,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("file-upload")?.click()}
                      >
                        {t("dialogs.addResource.selectFileBtn")}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="resource-description">{t("dialogs.addResource.descriptionLabel")}</Label>
            <Textarea
              id="resource-description"
              placeholder={t("dialogs.addResource.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                !title.trim() ||
                !resourceType ||
                (!selectedFile && !onAddResource && !(resourceType === "link" && webUrl.trim()))
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {resourceType === "link" && !selectedFile ? t("dialogs.addResource.addLink") : t("dialogs.addResource.uploadResource")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
