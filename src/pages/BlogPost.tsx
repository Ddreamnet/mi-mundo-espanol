import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { tr, enUS, es } from "date-fns/locale";
import { Calendar, Clock, ArrowLeft, Share2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { OptimizedImage } from "@/components/ui/optimized-image";
interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
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
const localeMap = {
  tr,
  en: enUS,
  es
};

// Parse content to get language-specific data
const getLocalizedContent = (post: BlogPostData, language: Language) => {
  try {
    const parsed = JSON.parse(post.content) as MultiLangContent;
    if (parsed.tr || parsed.en || parsed.es) {
      const langContent = parsed[language] || parsed.tr || parsed.en || parsed.es;
      return {
        title: langContent?.title || post.title,
        excerpt: langContent?.excerpt || post.excerpt || "",
        content: langContent?.content || ""
      };
    }
  } catch {
    // Not JSON, legacy format - return content as-is
  }
  // For legacy format, check if content looks like raw JSON and extract if possible
  if (post.content.startsWith('{"tr":') || post.content.startsWith('{"en":')) {
    try {
      const parsed = JSON.parse(post.content) as MultiLangContent;
      const langContent = parsed[language] || parsed.tr || parsed.en || parsed.es;
      return {
        title: langContent?.title || post.title,
        excerpt: langContent?.excerpt || post.excerpt || "",
        content: langContent?.content || ""
      };
    } catch {
      // Still not valid JSON
    }
  }
  return {
    title: post.title,
    excerpt: post.excerpt || "",
    content: post.content
  };
};
export default function BlogPost() {
  const {
    slug
  } = useParams<{
    slug: string;
  }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const {
    t
  } = useTranslation();
  const {
    language
  } = useLanguage();
  const {
    data: post,
    isLoading,
    error
  } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("blog_posts").select("*").eq("slug", slug).eq("is_published", true).single();
      if (error) throw error;
      return data as BlogPostData;
    },
    enabled: !!slug
  });
  const localized = post ? getLocalizedContent(post, language) : null;
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMMM yyyy", {
      locale: localeMap[language] || tr
    });
  };
  const getReadTimeText = (minutes: number) => {
    if (language === "en") return `${minutes} min read`;
    if (language === "es") return `${minutes} min de lectura`;
    return `${minutes} dk okuma`;
  };
  const estimateReadTime = (content: string) => {
    const words = content.split(" ").length;
    const minutes = Math.max(2, Math.ceil(words / 200));
    return getReadTimeText(minutes);
  };
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: localized?.title,
          url
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(language === "en" ? "Link copied!" : language === "es" ? "¡Enlace copiado!" : "Link kopyalandı!");
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const getCopiedText = () => {
    if (language === "en") return copied ? "Copied" : "Share";
    if (language === "es") return copied ? "Copiado" : "Compartir";
    return copied ? "Kopyalandı" : "Paylaş";
  };
  const getCopyLinkText = () => {
    if (language === "en") return "Copy Link";
    if (language === "es") return "Copiar Enlace";
    return "Linki Kopyala";
  };
  const getAllPostsText = () => {
    if (language === "en") return "All Posts";
    if (language === "es") return "Todos los Artículos";
    return "Tüm Yazılar";
  };
  const getOtherPostsText = () => {
    if (language === "en") return "Other Posts";
    if (language === "es") return "Otros Artículos";
    return "Diğer Yazılar";
  };
  if (error) {
    return <div className="min-h-screen bg-background">
        <LandingHeader />
        <div className="pt-32 pb-16 text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("blog.notFound")}</h1>
          <p className="text-muted-foreground mb-6">
            {language === "en" ? "The post you are looking for does not exist or has been removed." : language === "es" ? "El artículo que buscas no existe o ha sido eliminado." : "Aradığınız yazı mevcut değil veya kaldırılmış olabilir."}
          </p>
          <Button onClick={() => navigate("/blog")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("blog.backToBlog")}
          </Button>
        </div>
        <LandingFooter />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <LandingHeader />

      {isLoading ? <article className="pt-24 lg:pt-32 pb-16">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <Skeleton className="h-8 w-24 mb-6" />
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-12 w-3/4 mb-6" />
            <div className="flex gap-4 mb-8">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-80 w-full mb-8 rounded-xl" />
          </div>
        </article> : post && localized ? <article className="pt-24 lg:pt-32 pb-16">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl mb-8">
            <Button variant="ghost" onClick={() => navigate("/blog")} className="text-muted-foreground hover:text-foreground -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {getAllPostsText()}
            </Button>
          </div>

          <header className="container mx-auto px-4 lg:px-8 max-w-4xl mb-8">
            
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground mb-6 leading-tight">
              {localized.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(post.published_at || post.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{estimateReadTime(localized.content)}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleShare} className="ml-auto">
                {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Share2 className="w-4 h-4 mr-2" />}
                {getCopiedText()}
              </Button>
            </div>

            {localized.excerpt && <p className="text-lg text-muted-foreground leading-relaxed border-l-4 border-primary pl-4">
                {localized.excerpt}
              </p>}
          </header>

          {post.cover_image_url && <div className="container mx-auto px-4 lg:px-8 max-w-5xl mb-12">
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <OptimizedImage src={post.cover_image_url} alt={localized.title} aspectRatio="aspect-video" priority className="object-cover" />
              </div>
            </div>}

          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <div className="prose prose-lg max-w-none prose-headings:text-foreground prose-headings:font-bold prose-p:text-foreground/90 prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-ul:text-foreground/90 prose-ol:text-foreground/90 prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-img:rounded-xl prose-img:shadow-lg dark:prose-invert [&_p:empty]:min-h-[1.5em] [&_p:empty]:block" dangerouslySetInnerHTML={{
          __html: localized.content
        }} />
          </div>

          <div className="container mx-auto px-4 lg:px-8 max-w-4xl mt-16 pt-8 border-t border-border">
            <div className="flex items-center justify-between">
              <Button variant="secondary" onClick={() => navigate("/blog")} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {getOtherPostsText()}
              </Button>
              <Button variant="ghost" onClick={handleShare}>
                {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                {getCopyLinkText()}
              </Button>
            </div>
          </div>
        </article> : null}

      <LandingFooter />
    </div>;
}