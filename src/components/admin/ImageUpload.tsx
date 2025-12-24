import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
}

export function ImageUpload({ value, onChange, label = "Görsel", folder = "general" }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen bir görsel dosyası seçin");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu 5MB'dan küçük olmalıdır");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("cms-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("cms-images")
        .getPublicUrl(data.path);

      onChange(urlData.publicUrl);
      toast.success("Görsel yüklendi");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Görsel yüklenemedi");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {value ? (
        <div className="relative group">
          <img 
            src={value} 
            alt="Yüklenen görsel" 
            className="w-full h-40 object-cover rounded-lg border border-border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-4">
            Görsel yükleyin veya URL girin
          </p>
          
          <div className="flex gap-2 justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Yükle
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowUrlInput(!showUrlInput)}
            >
              URL Gir
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {showUrlInput && !value && (
        <Input
          placeholder="https://example.com/image.jpg"
          onChange={(e) => {
            if (e.target.value) {
              onChange(e.target.value);
              setShowUrlInput(false);
            }
          }}
        />
      )}
      
      {value && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Görsel URL'si"
          className="text-xs"
        />
      )}
    </div>
  );
}
