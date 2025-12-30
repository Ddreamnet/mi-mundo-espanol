import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Eye } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { ImageUpload } from "./ImageUpload";
import { LanguageTabs } from "./LanguageTabs";
import { Language } from "@/contexts/LanguageContext";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author_id: string;
}

interface MultiLangBlogContent {
  title: string;
  excerpt: string;
  content: string;
}

type MultiLangContent = {
  tr: MultiLangBlogContent;
  en: MultiLangBlogContent;
  es: MultiLangBlogContent;
};

interface BlogEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: BlogPost | null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

const defaultMultiLang: MultiLangContent = {
  tr: { title: "", excerpt: "", content: "" },
  en: { title: "", excerpt: "", content: "" },
  es: { title: "", excerpt: "", content: "" },
};

export function BlogEditorDialog({ open, onOpenChange, post }: BlogEditorDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [selectedLang, setSelectedLang] = useState<Language>("tr");
  const [multiLangContent, setMultiLangContent] = useState<MultiLangContent>(defaultMultiLang);
  const [slug, setSlug] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyle, Color],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[300px] p-4 focus:outline-none border rounded-md",
      },
    },
    onUpdate: ({ editor }) => {
      setMultiLangContent((prev) => ({
        ...prev,
        [selectedLang]: {
          ...prev[selectedLang],
          content: editor.getHTML(),
        },
      }));
    },
  });

  // Parse existing post content to determine if it's multi-lang
  const parsePostContent = (postData: BlogPost): MultiLangContent => {
    // Check if content is JSON (multi-lang format)
    try {
      const parsed = JSON.parse(postData.content);
      if (parsed.tr && parsed.en && parsed.es) {
        return parsed;
      }
    } catch {
      // Not JSON, it's legacy single-lang format
    }

    // Legacy format - use as Turkish content
    return {
      tr: {
        title: postData.title,
        excerpt: postData.excerpt || "",
        content: postData.content,
      },
      en: { title: "", excerpt: "", content: "" },
      es: { title: "", excerpt: "", content: "" },
    };
  };

  useEffect(() => {
    if (open) {
      if (post) {
        const parsed = parsePostContent(post);
        setMultiLangContent(parsed);
        setSlug(post.slug);
        setCoverImageUrl(post.cover_image_url || "");
        setIsPublished(post.is_published);
        setAutoSlug(false);
        editor?.commands.setContent(parsed.tr.content);
        setSelectedLang("tr");
      } else {
        setMultiLangContent(defaultMultiLang);
        setSlug("");
        setCoverImageUrl("");
        setIsPublished(false);
        setAutoSlug(true);
        editor?.commands.setContent("");
        setSelectedLang("tr");
      }
    }
  }, [open, post, editor]);

  // Update editor content when language changes
  useEffect(() => {
    if (editor) {
      editor.commands.setContent(multiLangContent[selectedLang].content);
    }
  }, [selectedLang, editor]);

  useEffect(() => {
    if (autoSlug && multiLangContent.tr.title) {
      setSlug(slugify(multiLangContent.tr.title));
    }
  }, [multiLangContent.tr.title, autoSlug]);

  const updateField = (field: keyof MultiLangBlogContent, value: string) => {
    setMultiLangContent((prev) => ({
      ...prev,
      [selectedLang]: {
        ...prev[selectedLang],
        [field]: value,
      },
    }));
  };


  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!multiLangContent.tr.title.trim()) throw new Error(t("editors.blog.titleRequired"));
      if (!slug.trim()) throw new Error(t("editors.blog.urlRequired"));
      if (!multiLangContent.tr.content.trim()) throw new Error(t("editors.blog.contentRequired"));

      // Store multi-lang content as JSON in content field
      const contentJson = JSON.stringify(multiLangContent);

      const postData = {
        title: multiLangContent.tr.title.trim(), // Use Turkish title as primary
        slug: slug.trim(),
        excerpt: multiLangContent.tr.excerpt.trim() || null, // Use Turkish excerpt as primary
        content: contentJson, // Store all languages as JSON
        cover_image_url: coverImageUrl.trim() || null,
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
        author_id: profile?.user_id,
      };

      if (post) {
        const { error } = await supabase
          .from("blog_posts")
          .update(postData)
          .eq("id", post.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(postData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      toast({
        title: t("common.success"),
        description: post ? t("editors.blog.postUpdated") : t("editors.blog.postCreated"),
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? t("editors.blog.editPost") : t("editors.blog.newPost")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Language Tabs */}
          <LanguageTabs selectedLang={selectedLang} onLanguageChange={setSelectedLang} />

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t("editors.blog.title")}</Label>
              <Input
                id="title"
                value={multiLangContent[selectedLang].title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder={t("editors.blog.titlePlaceholder")}
              />
            </div>

            {selectedLang === "tr" && (
              <div className="space-y-2">
                <Label htmlFor="slug">{t("editors.blog.url")}</Label>
                <div className="flex gap-2">
                  <span className="text-sm text-muted-foreground flex items-center">/blog/</span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setAutoSlug(false);
                    }}
                    placeholder={t("editors.blog.urlPlaceholder")}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="excerpt">{t("editors.blog.excerpt")}</Label>
              <Textarea
                id="excerpt"
                value={multiLangContent[selectedLang].excerpt}
                onChange={(e) => updateField("excerpt", e.target.value)}
                placeholder={t("editors.blog.excerptPlaceholder")}
                className="resize-none"
                rows={2}
              />
            </div>

            {selectedLang === "tr" && (
              <ImageUpload
                label={t("editors.blog.coverImage")}
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                folder="blog"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("editors.blog.content")}</Label>
            <div className="border rounded-md">
              <div className="flex gap-1 p-2 border-b bg-muted flex-wrap">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={editor?.isActive("bold") ? "bg-accent" : ""}
                >
                  <strong>B</strong>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={editor?.isActive("italic") ? "bg-accent" : ""}
                >
                  <em>I</em>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  className={editor?.isActive("underline") ? "bg-accent" : ""}
                >
                  <u>U</u>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={editor?.isActive("heading", { level: 2 }) ? "bg-accent" : ""}
                >
                  H2
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={editor?.isActive("heading", { level: 3 }) ? "bg-accent" : ""}
                >
                  H3
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={editor?.isActive("bulletList") ? "bg-accent" : ""}
                >
                  • List
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={editor?.isActive("orderedList") ? "bg-accent" : ""}
                >
                  1. List
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  className={editor?.isActive("blockquote") ? "bg-accent" : ""}
                >
                  "
                </Button>
              </div>
              <EditorContent editor={editor} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="publish"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
              <Label htmlFor="publish" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {t("editors.blog.publish")}
              </Label>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
