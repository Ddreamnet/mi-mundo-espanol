// ============================================================================
// ÖĞRENCİ KONULARI İÇERİĞİ
// ============================================================================
// Bu bileşen öğretmenlerin bir öğrenciye özel konu ve kaynak atamasını,
// global konuları görüntülemesini sağlar. Tab sistemi için ayrılmış hali.

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Video,
  Link as LinkIcon,
  Image,
  BookOpen,
} from "lucide-react";
import { LessonTracker } from "./LessonTracker";
import { useTranslation } from "react-i18next";

// ============================================================================
// TİPLER
// ============================================================================

interface Topic {
  id: string;
  title: string;
  description: string;
  is_completed: boolean;
  completed_at: string | null;
  order_index: number;
  resources: Resource[];
  isGlobal?: boolean;
  category_id?: string | null;
}

interface Category {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
}

interface Resource {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  resource_url: string;
  order_index: number;
  is_completed?: boolean;
  completed_at?: string | null;
}

interface Student {
  id: string;
  student_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface StudentTopicsContentProps {
  student: Student;
  teacherId: string;
}

// ============================================================================
// ANA BİLEŞEN
// ============================================================================

export function StudentTopicsContent({ student, teacherId }: StudentTopicsContentProps) {
  const { t } = useTranslation();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    fetchTopics();
  }, [student.student_id]);

  // ============================================================================
  // VERİ ÇEKME FONKSİYONLARI
  // ============================================================================

  const fetchTopics = async () => {
    try {
      const [studentTopicsResponse, globalTopicsResponse, completionResponse, categoriesResponse] = await Promise.all([
        supabase
          .from("topics")
          .select("*, resources (*)")
          .eq("student_id", student.student_id)
          .order("order_index"),
        
        supabase
          .from("global_topics")
          .select("*, global_topic_resources(*)")
          .order("order_index"),
        
        supabase
          .from("student_resource_completion")
          .select("*")
          .eq("student_id", student.student_id),
        
        supabase
          .from("global_topic_categories")
          .select("*")
          .eq("is_active", true)
          .order("order_index")
      ]);

      if (studentTopicsResponse.error) throw studentTopicsResponse.error;
      if (globalTopicsResponse.error) throw globalTopicsResponse.error;
      if (completionResponse.error) throw completionResponse.error;
      if (categoriesResponse.error) throw categoriesResponse.error;

      const studentTopics = studentTopicsResponse.data || [];
      const globalTopics = globalTopicsResponse.data || [];
      const completionData = completionResponse.data || [];
      const categoriesData = categoriesResponse.data || [];

      setCategories(categoriesData);

      const completionMap = new Map();
      completionData.forEach((completion) => {
        completionMap.set(completion.resource_id, completion);
      });

      const processedStudentTopics = studentTopics.map((topic) => ({
        ...topic,
        resources: topic.resources
          .map((resource: any) => {
            const completion = completionMap.get(resource.id);
            return {
              ...resource,
              is_completed: completion?.is_completed || false,
              completed_at: completion?.completed_at,
            };
          })
          .sort((a: Resource, b: Resource) => a.order_index - b.order_index),
        isGlobal: false,
      }));

      const studentTopicTitles = new Set(processedStudentTopics.map((t) => t.title));

      const processedGlobalTopics = (globalTopics || [])
        .filter((topic) => !studentTopicTitles.has(topic.title))
        .map((topic) => {
          const globalResources = (topic.global_topic_resources || [])
            .map((res: any) => {
              const completion = completionMap.get(res.id);
              return {
                id: res.id,
                title: res.title,
                description: res.description,
                resource_type: res.resource_type,
                resource_url: res.resource_url,
                order_index: res.order_index,
                is_completed: completion?.is_completed || false,
                completed_at: completion?.completed_at,
              };
            })
            .sort((a: Resource, b: Resource) => a.order_index - b.order_index);

          const allResourcesCompleted =
            globalResources.length > 0 && globalResources.every((resource) => resource.is_completed);

          return {
            id: topic.id,
            title: topic.title,
            description: topic.description,
            is_completed: allResourcesCompleted,
            completed_at: allResourcesCompleted ? new Date().toISOString() : null,
            order_index: topic.order_index,
            resources: globalResources,
            isGlobal: true,
            category_id: topic.category_id,
          };
        });

      setTopics([...processedStudentTopics, ...processedGlobalTopics]);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("messages.topicsLoadError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // KONU YÖNETİMİ FONKSİYONLARI
  // ============================================================================

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // ============================================================================
  // KAYNAK YÖNETİMİ FONKSİYONLARI
  // ============================================================================

  const toggleResourceCompletion = async (resourceId: string, isCompleted: boolean, isGlobalResource: boolean) => {
    try {
      const { error } = await supabase.from("student_resource_completion").upsert(
        {
          student_id: student.student_id,
          resource_id: resourceId,
          is_completed: !isCompleted,
          completed_at: !isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "student_id,resource_id",
        },
      );

      if (error) throw error;

      const status = !isCompleted ? t("studentTopics.completed") : t("studentTopics.notCompleted");
      toast({
        title: t("common.success"),
        description: t("studentTopics.resourceMarked", { status }),
      });

      fetchTopics();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleTopicCompletion = async (topicId: string, isCompleted: boolean, isGlobal: boolean) => {
    try {
      if (isGlobal) {
        const topic = topics.find(t => t.id === topicId);
        if (!topic) return;

        for (const resource of topic.resources) {
          await supabase.from("student_resource_completion").upsert(
            {
              student_id: student.student_id,
              resource_id: resource.id,
              is_completed: !isCompleted,
              completed_at: !isCompleted ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "student_id,resource_id",
            },
          );
        }
      } else {
        const { error } = await supabase
          .from("topics")
          .update({
            is_completed: !isCompleted,
            completed_at: !isCompleted ? new Date().toISOString() : null,
          })
          .eq("id", topicId);

        if (error) throw error;
      }

      const status = !isCompleted ? t("studentTopics.completed") : t("studentTopics.notCompleted");
      toast({
        title: t("common.success"),
        description: t("studentTopics.topicMarked", { status }),
      });

      fetchTopics();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ============================================================================
  // YARDIMCI FONKSİYONLAR
  // ============================================================================

  const getVisibleResources = (topic: Topic) => {
    return topic.resources;
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "pdf":
      case "document":
        return <FileText className="h-4 w-4" />;
      case "link":
        return <LinkIcon className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      default:
        return <ExternalLink className="h-4 w-4" />;
    }
  };

  // ============================================================================
  // RENDER - LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // SUB-COMPONENT - TOPIC CARD
  // ============================================================================

  const TopicCard = ({ topic }: { topic: Topic }) => {
    const visibleResources = getVisibleResources(topic);

    return (
      <Card className="border-l-4 border-l-primary/30">
        <CardContent className="p-4">
          <Collapsible open={expandedTopics.has(topic.id)} onOpenChange={() => toggleTopic(topic.id)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Checkbox 
                  checked={topic.is_completed} 
                  onCheckedChange={() => toggleTopicCompletion(topic.id, topic.is_completed, topic.isGlobal || false)}
                />

                <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                  {expandedTopics.has(topic.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium">
                      {topic.title}
                      {topic.isGlobal && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Global
                        </Badge>
                      )}
                    </h4>
                    {topic.description && <p className="text-sm opacity-70">{topic.description}</p>}
                  </div>
                </CollapsibleTrigger>

                <div className="flex items-center gap-2">
                  {topic.is_completed && <Badge variant="secondary">{t("studentTopics.completed")}</Badge>}
                  <Badge variant="outline">{topic.resources.length} {t("common.resource")}</Badge>
                </div>
              </div>
            </div>

            <CollapsibleContent className="mt-4">
              <div className="pl-8 space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="font-medium text-sm">{t("common.resources")}</h5>
                </div>

                {visibleResources.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {topic.resources.length === 0 ? t("studentTopics.noResources") : t("studentTopics.noVisibleResources")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {visibleResources.map((resource) => (
                      <div key={resource.id} className="flex items-center gap-3 p-2 bg-accent/30 rounded-md">
                        <Checkbox 
                          checked={resource.is_completed || false}
                          onCheckedChange={() => toggleResourceCompletion(resource.id, resource.is_completed || false, topic.isGlobal || false)}
                        />
                        {getResourceIcon(resource.resource_type)}
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => window.open(resource.resource_url, "_blank")}
                        >
                          <p className="font-medium text-sm hover:text-primary transition-colors">{resource.title}</p>
                          {resource.description && (
                            <p className="text-xs opacity-70">{resource.description}</p>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => window.open(resource.resource_url, "_blank")}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    );
  };

  // ============================================================================
  // HELPER - KATEGORİ BAZLI GRUPLAMA
  // ============================================================================

  const studentTopics = topics.filter(t => !t.isGlobal);
  const globalTopics = topics.filter(t => t.isGlobal);
  
  const getTopicsForCategory = (categoryId: string) => {
    return globalTopics.filter(t => t.category_id === categoryId);
  };

  const uncategorizedGlobalTopics = globalTopics.filter(t => !t.category_id);

  // ============================================================================
  // SUB-COMPONENT - CATEGORY SECTION
  // ============================================================================

  const CategorySection = ({ category }: { category: Category }) => {
    const categoryTopics = getTopicsForCategory(category.id);
    const completedCount = categoryTopics.filter(t => t.is_completed).length;
    const isExpanded = expandedCategories.has(category.id);

    if (categoryTopics.length === 0) return null;

    return (
      <Card className="border-l-4 border-l-primary">
        <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category.id)}>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  <div className="text-left">
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    {category.description && (
                      <CardDescription>{category.description}</CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {completedCount} / {categoryTopics.length} {t("studentTopics.topicsCompleted")}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              {categoryTopics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  // ============================================================================
  // RENDER - ANA İÇERİK
  // ============================================================================

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {t("studentTopics.topicsFor", { name: student.profiles.full_name })}
              </CardTitle>
              <CardDescription>
                {topics.filter((t) => t.is_completed).length} / {topics.length} {t("studentTopics.topicsCompleted")}
              </CardDescription>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* İşlenen Dersler */}
              <LessonTracker
                studentId={student.student_id}
                studentName={student.profiles.full_name}
                teacherId={teacherId}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Öğrenciye Özel Konular */}
          {studentTopics.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {t("studentTopics.studentSpecificTopics")}
              </h3>
              {studentTopics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          )}

          {/* Global Konular - Kategorilere Göre */}
          {(categories.length > 0 || uncategorizedGlobalTopics.length > 0) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {t("studentTopics.globalTopics")}
              </h3>
              
              {/* Kategorili Konular */}
              {categories.map((category) => (
                <CategorySection key={category.id} category={category} />
              ))}

              {/* Kategorisiz Global Konular */}
              {uncategorizedGlobalTopics.length > 0 && (
                <Card className="border-l-4 border-l-muted-foreground/30">
                  <Collapsible 
                    open={expandedCategories.has("uncategorized")} 
                    onOpenChange={() => toggleCategory("uncategorized")}
                  >
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedCategories.has("uncategorized") ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                            <div className="text-left">
                              <CardTitle className="text-lg">{t("globalTopics.uncategorized")}</CardTitle>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {uncategorizedGlobalTopics.filter(t => t.is_completed).length} / {uncategorizedGlobalTopics.length} {t("studentTopics.topicsCompleted")}
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-3">
                        {uncategorizedGlobalTopics.map((topic) => (
                          <TopicCard key={topic.id} topic={topic} />
                        ))}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              )}
            </div>
          )}

          {topics.length === 0 && (
            <div className="text-center py-8">
              <p className="opacity-70">{t("studentTopics.noTopics")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
