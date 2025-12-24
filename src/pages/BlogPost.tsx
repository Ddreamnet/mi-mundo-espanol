import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar, Clock, ArrowLeft, Share2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (error) throw error;
      return data as BlogPost;
    },
    enabled: !!slug,
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMMM yyyy", { locale: tr });
  };

  const estimateReadTime = (content: string) => {
    const words = content.split(" ").length;
    const minutes = Math.max(2, Math.ceil(words / 200));
    return `${minutes} dk okuma`;
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          url: url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link kopyalandı!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <div className="pt-32 pb-16 text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Yazı bulunamadı</h1>
          <p className="text-muted-foreground mb-6">Aradığınız yazı mevcut değil veya kaldırılmış olabilir.</p>
          <Button onClick={() => navigate("/blog")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Blog'a Dön
          </Button>
        </div>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      {isLoading ? (
        <article className="pt-24 lg:pt-32 pb-16">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <Skeleton className="h-8 w-24 mb-6" />
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-12 w-3/4 mb-6" />
            <div className="flex gap-4 mb-8">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-80 w-full mb-8 rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </article>
      ) : post ? (
        <article className="pt-24 lg:pt-32 pb-16">
          {/* Back Button */}
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/blog")}
              className="text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tüm Yazılar
            </Button>
          </div>

          {/* Header */}
          <header className="container mx-auto px-4 lg:px-8 max-w-4xl mb-8">
            <Badge variant="secondary" className="mb-4">
              Blog
            </Badge>
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(post.published_at || post.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{estimateReadTime(post.content)}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="ml-auto"
              >
                {copied ? (
                  <Check className="w-4 h-4 mr-2 text-green-500" />
                ) : (
                  <Share2 className="w-4 h-4 mr-2" />
                )}
                {copied ? "Kopyalandı" : "Paylaş"}
              </Button>
            </div>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-lg text-muted-foreground leading-relaxed border-l-4 border-primary pl-4">
                {post.excerpt}
              </p>
            )}
          </header>

          {/* Cover Image */}
          {post.cover_image_url && (
            <div className="container mx-auto px-4 lg:px-8 max-w-5xl mb-12">
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <img
                  src={post.cover_image_url}
                  alt={post.title}
                  className="w-full h-64 lg:h-96 object-cover"
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <div 
              className="prose prose-lg max-w-none
                prose-headings:text-foreground prose-headings:font-bold
                prose-p:text-foreground/90 prose-p:leading-relaxed
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-strong:text-foreground
                prose-ul:text-foreground/90 prose-ol:text-foreground/90
                prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
                prose-img:rounded-xl prose-img:shadow-lg
                dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>

          {/* Bottom Navigation */}
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl mt-16 pt-8 border-t border-border">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => navigate("/blog")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Diğer Yazılar
              </Button>
              <Button
                variant="ghost"
                onClick={handleShare}
              >
                {copied ? (
                  <Check className="w-4 h-4 mr-2 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                Linki Kopyala
              </Button>
            </div>
          </div>
        </article>
      ) : null}

      <LandingFooter />
    </div>
  );
}
