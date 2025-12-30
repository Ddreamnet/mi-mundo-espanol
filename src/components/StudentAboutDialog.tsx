import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Undo, Redo, Heading1, Heading2, Heading3, Palette } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface StudentAboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  aboutText: string | null;
  isReadOnly?: boolean;
  onSaved?: () => void;
}

export function StudentAboutDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  aboutText,
  isReadOnly = false,
  onSaved,
}: StudentAboutDialogProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [currentAboutText, setCurrentAboutText] = useState<string | null>(aboutText);
  const [loading, setLoading] = useState(false);

  const COLORS = [
    { name: t("studentAbout.colorDefault"), value: "inherit" },
    { name: t("studentAbout.colorRed"), value: "#ef4444" },
    { name: t("studentAbout.colorOrange"), value: "#f97316" },
    { name: t("studentAbout.colorYellow"), value: "#eab308" },
    { name: t("studentAbout.colorGreen"), value: "#22c55e" },
    { name: t("studentAbout.colorBlue"), value: "#3b82f6" },
    { name: t("studentAbout.colorPurple"), value: "#8b5cf6" },
    { name: t("studentAbout.colorPink"), value: "#ec4899" },
    { name: t("studentAbout.colorGray"), value: "#6b7280" },
  ];

  // Diyalog açıldığında veritabanından güncel veriyi çek
  useEffect(() => {
    if (open && studentId) {
      setLoading(true);
      supabase
        .from("students")
        .select("about_text")
        .eq("student_id", studentId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setCurrentAboutText(data.about_text);
          }
          setLoading(false);
        });
    }
  }, [open, studentId]);

  const contentInitializedRef = useRef(false);
  const lastOpenStateRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      Color,
    ],
    content: "",
    editable: !isReadOnly,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[150px] p-4 focus:outline-none [&_*]:text-popover-foreground [&_p]:text-popover-foreground [&_h1]:text-popover-foreground [&_h2]:text-popover-foreground [&_h3]:text-popover-foreground [&_li]:text-popover-foreground",
      },
    },
    onUpdate: ({ editor }) => {
      // Heading'den sonra boş paragraf oluşturulduğunda, heading formatını kaldır
      const { $from } = editor.state.selection;
      const currentNode = $from.parent;
      
      // Eğer boş heading'e Enter ile geçilmişse, paragraph'a dönüştür
      if (currentNode.type.name === 'heading' && currentNode.textContent === '') {
        editor.chain().setParagraph().run();
      }
    },
  });

  const lastStudentIdRef = useRef<string | null>(null);

  // Öğrenci değiştiğinde state'leri sıfırla
  useEffect(() => {
    if (studentId !== lastStudentIdRef.current) {
      contentInitializedRef.current = false;
      setCurrentAboutText(null); // Eski öğrencinin verisini temizle
      lastStudentIdRef.current = studentId;
      
      // Editor içeriğini de hemen temizle
      if (editor) {
        editor.commands.setContent("");
      }
    }
  }, [studentId, editor]);

  // Dialog kapandığında flag'i sıfırla
  useEffect(() => {
    if (!open && lastOpenStateRef.current) {
      contentInitializedRef.current = false;
    }
    lastOpenStateRef.current = open;
  }, [open]);

  // İçeriği sadece bir kez set et (dialog açılıp veri yüklendiğinde)
  useEffect(() => {
    if (editor && open && !loading && !contentInitializedRef.current) {
      // setContent ile içeriği yükle - undo/redo history temiz başlar
      editor.commands.setContent(currentAboutText || "");
      editor.setEditable(!isReadOnly);
      contentInitializedRef.current = true;
    }
  }, [currentAboutText, open, editor, isReadOnly, loading]);

  const handleSave = async () => {
    if (!editor) return;
    
    setSaving(true);
    try {
      const htmlContent = editor.getHTML();
      const { error } = await supabase
        .from("students")
        .update({ about_text: htmlContent === "<p></p>" ? null : htmlContent })
        .eq("student_id", studentId);

      if (error) throw error;

      toast.success(t("studentAbout.infoSaved"));
      await onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving about text:", error);
      toast.error(t("studentAbout.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const setColor = (color: string) => {
    if (color === "inherit") {
      // Sadece seçili metin için rengi kaldır (unsetMark kullan)
      editor?.chain().focus().unsetMark('textStyle').run();
    } else {
      editor?.chain().focus().setColor(color).run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-primary">📝</span>
            {t("studentAbout.aboutTitle", { name: studentName })}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {!isReadOnly && (
            <div className="flex flex-wrap items-center gap-1 p-2 border rounded-t-lg bg-muted/30 border-b-0">
              {/* Headings */}
              <Toggle
                size="sm"
                pressed={editor.isActive("heading", { level: 1 })}
                onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                aria-label={t("studentAbout.heading1")}
                title={t("studentAbout.heading1")}
              >
                <Heading1 className="h-4 w-4" />
              </Toggle>
              <Toggle
                size="sm"
                pressed={editor.isActive("heading", { level: 2 })}
                onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                aria-label={t("studentAbout.heading2")}
                title={t("studentAbout.heading2")}
              >
                <Heading2 className="h-4 w-4" />
              </Toggle>
              <Toggle
                size="sm"
                pressed={editor.isActive("heading", { level: 3 })}
                onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                aria-label={t("studentAbout.heading3")}
                title={t("studentAbout.heading3")}
              >
                <Heading3 className="h-4 w-4" />
              </Toggle>
              
              <Separator orientation="vertical" className="h-6 mx-1" />
              
              {/* Text formatting */}
              <Toggle
                size="sm"
                pressed={editor.isActive("bold")}
                onPressedChange={() => editor.chain().focus().toggleBold().run()}
                aria-label={t("studentAbout.bold")}
                title={t("studentAbout.bold")}
              >
                <Bold className="h-4 w-4" />
              </Toggle>
              <Toggle
                size="sm"
                pressed={editor.isActive("italic")}
                onPressedChange={() => editor.chain().focus().toggleItalic().run()}
                aria-label={t("studentAbout.italic")}
                title={t("studentAbout.italic")}
              >
                <Italic className="h-4 w-4" />
              </Toggle>
              <Toggle
                size="sm"
                pressed={editor.isActive("underline")}
                onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
                aria-label={t("studentAbout.underline")}
                title={t("studentAbout.underline")}
              >
                <UnderlineIcon className="h-4 w-4" />
              </Toggle>
              
              {/* Color picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={t("studentAbout.textColor")}>
                    <Palette className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-3 gap-1">
                    {COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setColor(color.value)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm transition-colors"
                        title={color.name}
                      >
                        <div 
                          className="w-4 h-4 rounded-full border border-border"
                          style={{ backgroundColor: color.value === "inherit" ? "transparent" : color.value }}
                        />
                        <span className="text-xs">{color.name}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Separator orientation="vertical" className="h-6 mx-1" />
              
              {/* Lists */}
              <Toggle
                size="sm"
                pressed={editor.isActive("bulletList")}
                onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                aria-label={t("studentAbout.bulletList")}
                title={t("studentAbout.bulletList")}
              >
                <List className="h-4 w-4" />
              </Toggle>
              <Toggle
                size="sm"
                pressed={editor.isActive("orderedList")}
                onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                aria-label={t("studentAbout.orderedList")}
                title={t("studentAbout.orderedList")}
              >
                <ListOrdered className="h-4 w-4" />
              </Toggle>
              
              <Separator orientation="vertical" className="h-6 mx-1" />
              
              {/* Undo/Redo */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="h-8 w-8 p-0"
                title={t("studentAbout.undo")}
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="h-8 w-8 p-0"
                title={t("studentAbout.redo")}
              >
                <Redo className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div 
            className={`border rounded-lg bg-background ${!isReadOnly ? 'rounded-t-none border-t-0' : ''} ${
              isReadOnly ? 'bg-muted/20' : ''
            }`}
          >
            {isReadOnly && (!aboutText || aboutText === "<p></p>") ? (
              <div className="min-h-[150px] p-4 flex items-center justify-center">
                <span className="opacity-70 italic">{t("studentAbout.noInfoYet")}</span>
              </div>
            ) : (
              <EditorContent editor={editor} />
            )}
          </div>
        </div>

        {!isReadOnly && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}