import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Eye, EyeOff, FileText, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BlogEditorDialog } from "./BlogEditorDialog";
import { format } from "date-fns";
import { tr, enUS, es } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export function BlogManager() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  
  const getLocale = () => {
    switch (i18n.language) {
      case "en": return enUS;
      case "es": return es;
      default: return tr;
    }
  };

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast({ title: t("common.success"), description: t("blog.postDeleted") });
      setDeletingPostId(null);
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          is_published,
          published_at: is_published ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { is_published }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast({
        title: t("common.success"),
        description: is_published ? t("blog.postPublished") : t("blog.postUnpublished"),
      });
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const handleNewPost = () => {
    setEditingPost(null);
    setShowEditor(true);
  };

  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post);
    setShowEditor(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg">{t("blog.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("blog.description")}
          </p>
        </div>
        <Button onClick={handleNewPost}>
          <Plus className="h-4 w-4 mr-2" />
          {t("blog.newPost")}
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <FileText className="h-12 w-12 mb-4" />
          <p>{t("blog.noPostsYet")}</p>
          <Button variant="outline" className="mt-4" onClick={handleNewPost}>
            {t("blog.addFirstPost")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <div className="flex">
                {post.cover_image_url && (
                  <div className="w-32 h-24 shrink-0">
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{post.title}</h4>
                        <Badge variant={post.is_published ? "default" : "secondary"}>
                          {post.is_published ? t("blog.published") : t("blog.draft")}
                        </Badge>
                      </div>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(post.created_at), "d MMMM yyyy", { locale: getLocale() })}
                        </span>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="font-mono text-xs">/blog/{post.slug}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          togglePublishMutation.mutate({
                            id: post.id,
                            is_published: !post.is_published,
                          })
                        }
                        title={post.is_published ? t("blog.unpublish") : t("blog.publish")}
                        className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        {post.is_published ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditPost(post)}
                        title={t("common.edit")}
                        className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeletingPostId(post.id)}
                        className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        title={t("common.delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}

      <BlogEditorDialog
        open={showEditor}
        onOpenChange={setShowEditor}
        post={editingPost}
      />

      <AlertDialog open={!!deletingPostId} onOpenChange={() => setDeletingPostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("blog.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("blog.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPostId && deleteMutation.mutate(deletingPostId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
