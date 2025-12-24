import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
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

export function BlogEditorDialog({ open, onOpenChange, post }: BlogEditorDialogProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
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
  });

  useEffect(() => {
    if (open) {
      if (post) {
        setTitle(post.title);
        setSlug(post.slug);
        setExcerpt(post.excerpt || "");
        setCoverImageUrl(post.cover_image_url || "");
        setIsPublished(post.is_published);
        setAutoSlug(false);
        editor?.commands.setContent(post.content);
      } else {
        setTitle("");
        setSlug("");
        setExcerpt("");
        setCoverImageUrl("");
        setIsPublished(false);
        setAutoSlug(true);
        editor?.commands.setContent("");
      }
    }
  }, [open, post, editor]);

  useEffect(() => {
    if (autoSlug && title) {
      setSlug(slugify(title));
    }
  }, [title, autoSlug]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const content = editor?.getHTML() || "";
      
      if (!title.trim()) throw new Error("Başlık zorunludur");
      if (!slug.trim()) throw new Error("URL zorunludur");
      if (!content.trim()) throw new Error("İçerik zorunludur");

      const postData = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || null,
        content,
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
      toast({
        title: "Başarılı",
        description: post ? "Blog yazısı güncellendi" : "Blog yazısı oluşturuldu",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? "Blog Yazısını Düzenle" : "Yeni Blog Yazısı"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Başlık</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Yazı başlığı..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL</Label>
              <div className="flex gap-2">
                <span className="text-sm text-muted-foreground flex items-center">/blog/</span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setAutoSlug(false);
                  }}
                  placeholder="yazi-url"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Özet (SEO için)</Label>
              <Textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Kısa özet (160 karakter)..."
                className="resize-none"
                rows={2}
              />
            </div>

            <ImageUpload
              label="Kapak Görseli"
              value={coverImageUrl}
              onChange={setCoverImageUrl}
              folder="blog"
            />
          </div>

          <div className="space-y-2">
            <Label>İçerik</Label>
            <div className="border rounded-md">
              <div className="flex gap-1 p-2 border-b bg-muted/50 flex-wrap">
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
                Yayınla
              </Label>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
