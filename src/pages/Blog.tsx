import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr, enUS, es } from "date-fns/locale";
import { Calendar, Clock, ArrowRight, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage, Language } from "@/contexts/LanguageContext";
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
const getLocalizedContent = (post: BlogPost, language: Language) => {
  try {
    const parsed = JSON.parse(post.content) as MultiLangContent;
    if (parsed.tr && parsed.en && parsed.es) {
      const langContent = parsed[language] || parsed.tr;
      // Get first 15 characters of content (strip HTML tags)
      const plainContent = langContent.content.replace(/<[^>]*>/g, '');
      const shortExcerpt = plainContent.substring(0, 15) + (plainContent.length > 15 ? '...' : '');
      return {
        title: langContent.title || post.title,
        excerpt: shortExcerpt
      };
    }
  } catch {
    // Not JSON, legacy format
  }
  // Fallback: use content field
  const plainContent = post.content.replace(/<[^>]*>/g, '');
  const shortExcerpt = plainContent.substring(0, 15) + (plainContent.length > 15 ? '...' : '');
  return {
    title: post.title,
    excerpt: shortExcerpt
  };
};
export default function Blog() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const {
    t
  } = useTranslation();
  const {
    language
  } = useLanguage();
  const {
    data: posts,
    isLoading
  } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("blog_posts").select("id, title, slug, excerpt, content, cover_image_url, published_at, created_at").eq("is_published", true).order("published_at", {
        ascending: false
      });
      if (error) throw error;
      return data as BlogPost[];
    }
  });
  const filteredPosts = posts?.filter(post => {
    const localized = getLocalizedContent(post, language);
    return localized.title.toLowerCase().includes(searchQuery.toLowerCase()) || localized.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
  });
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMMM yyyy", {
      locale: localeMap[language] || tr
    });
  };
  const estimateReadTime = (excerpt: string | null) => {
    if (!excerpt) return language === "en" ? "2 min" : language === "es" ? "2 min" : "2 dk";
    const words = excerpt.split(" ").length;
    const minutes = Math.max(2, Math.ceil(words / 200));
    return language === "en" ? `${minutes} min` : language === "es" ? `${minutes} min` : `${minutes} dk`;
  };
  return <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <section className="pt-24 pb-12 lg:pt-32 lg:pb-16 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            
            <h1 className="text-3xl lg:text-5xl font-montserrat font-bold text-foreground mb-4">
              {t("blog.pageTitle", "Blog")}
            </h1>
            <p className="text-muted-foreground text-lg mb-8">{t("blog.pageSubtitle", "İspanyolca öğrenme yolculuğunuzda size yardımcı olacak içerikler")}</p>
            
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input type="text" placeholder={language === "en" ? "Search posts..." : language === "es" ? "Buscar artículos..." : "Yazı ara..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 h-12 text-base bg-card border-border/50 focus:border-primary" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16 pb-[12px] pt-[12px]">
        <div className="container mx-auto px-4 lg:px-8">
          {isLoading ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {[1, 2, 3].map(i => <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-24 mb-3" />
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>)}
            </div> : filteredPosts && filteredPosts.length > 0 ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {filteredPosts.map(post => {
            const localized = getLocalizedContent(post, language);
            return <Card key={post.id} className="group overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/50 bg-card" onClick={() => navigate(`/blog/${post.slug}`)}>
                    <div className="relative overflow-hidden h-48">
                      {post.cover_image_url ? <img src={post.cover_image_url} alt={localized.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                          <span className="text-4xl">📚</span>
                        </div>}
                    </div>
                    <CardContent className="p-6 bg-card">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(post.published_at || post.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{estimateReadTime(localized.excerpt)}</span>
                        </div>
                      </div>
                      <h2 className="font-bold text-card-foreground mb-2 group-hover:text-primary transition-colors text-lg">{localized.title}</h2>
                      {localized.excerpt && <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{localized.excerpt}</p>}
                      <div className="flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
                        <span>{t("blog.readMore", "Devamını Oku")}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </CardContent>
                  </Card>;
          })}
            </div> : <div className="text-center py-16">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{t("blog.noPosts", "Henüz blog yazısı yok.")}</h3>
            </div>}
        </div>
      </section>

      <LandingFooter />
    </div>;
}