import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

interface EditResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditResource: (
    id: string,
    title: string,
    description: string,
    resourceType: string,
    resourceUrl: string,
  ) => Promise<void>;
  resource: {
    id: string;
    title: string;
    description: string;
    resource_type: string;
    resource_url: string;
  } | null;
}

export function EditResourceDialog({ open, onOpenChange, onEditResource, resource }: EditResourceDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState("link");
  const [resourceUrl, setResourceUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resource) {
      setTitle(resource.title);
      setDescription(resource.description || "");
      setResourceType(resource.resource_type);
      setResourceUrl(resource.resource_url);
    }
  }, [resource]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource) return;

    setLoading(true);
    try {
      await onEditResource(resource.id, title, description, resourceType, resourceUrl);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogs.editResource.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">{t("dialogs.editResource.titleLabel")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("dialogs.editResource.titlePlaceholder")}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">{t("dialogs.editResource.descriptionLabel")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("dialogs.editResource.descriptionPlaceholder")}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="resourceType">{t("dialogs.editResource.typeLabel")}</Label>
            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger>
                <SelectValue placeholder={t("dialogs.editResource.typePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">{t("dialogs.editResource.types.video")}</SelectItem>
                <SelectItem value="pdf">{t("dialogs.editResource.types.pdf")}</SelectItem>
                <SelectItem value="document">{t("dialogs.editResource.types.document")}</SelectItem>
                <SelectItem value="link">{t("dialogs.editResource.types.link")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="resourceUrl">{t("dialogs.editResource.urlLabel")}</Label>
            <Input
              id="resourceUrl"
              type="url"
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
              placeholder={t("dialogs.editResource.urlPlaceholder")}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
