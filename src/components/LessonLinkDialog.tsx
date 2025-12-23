import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link as LinkIcon, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LessonLinkDialogProps {
  teacherId: string;
}

export function LessonLinkDialog({ teacherId }: LessonLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [lessonLink, setLessonLink] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCurrentLink();
    }
  }, [open, teacherId]);

  const fetchCurrentLink = async () => {
    try {
      // Get the first student's lesson link as the default (all students share the same link)
      const { data, error } = await supabase
        .from("students")
        .select("lesson_link")
        .eq("teacher_id", teacherId)
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (data?.lesson_link) {
        setLessonLink(data.lesson_link);
      }
    } catch (error: any) {
      console.error("Failed to fetch lesson link:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update all students of this teacher with the same lesson link
      const { error } = await supabase
        .from("students")
        .update({ lesson_link: lessonLink.trim() || null })
        .eq("teacher_id", teacherId);

      if (error) throw error;

      toast({
        title: "Başarılı",
        description: "Ders linki kaydedildi",
      });
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Hata",
        description: "Link kaydedilemedi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LinkIcon className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Link</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ders Linki</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lesson-link">Zoom, Google Meet veya başka bir ders linki</Label>
            <Input
              id="lesson-link"
              type="url"
              placeholder="https://zoom.us/j/..."
              value={lessonLink}
              onChange={(e) => setLessonLink(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Bu link tüm öğrencilerinize gösterilecektir.
            </p>
          </div>
          <Button onClick={handleSave} disabled={loading} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
