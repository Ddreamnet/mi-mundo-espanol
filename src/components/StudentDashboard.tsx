// ============================================================================
// ÖĞRENCİ PANELİ
// ============================================================================
// Bu bileşen öğrencilerin kendi öğrenme materyallerini ve ödevlerini görüntülemesini sağlar.

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  BookOpen,
  CheckCircle,
  Clock,
  ExternalLink,
  ClipboardList,
  FileText,
} from "lucide-react";
import { Header } from "./Header";
import { StudentLessonTracker } from "./StudentLessonTracker";
import { HomeworkSection } from "./HomeworkSection";
import { LessonNotesSection } from "./LessonNotesSection";
import { JoinLessonCard } from "./JoinLessonCard";
import { NotificationBell } from "./NotificationBell";
import { getResourceIcon } from "@/utils/resourceIcons";
import { LoadingSpinner } from "./shared/LoadingSpinner";

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

// ============================================================================
// ANA BİLEŞEN
// ============================================================================

export function StudentDashboard() {
  const { t } = useTranslation();
  
  // ============================================================================
  // STATE YÖNETİMİ
  // ============================================================================

  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [teacherId, setTeacherId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("topics");
  const { profile, signOut, signingOut } = useAuth();
  const { toast } = useToast();

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (profile?.user_id) {
      fetchTopics();
    }
  }, [profile]);

  // ============================================================================
  // VERİ ÇEKME FONKSİYONLARI
  // ============================================================================

  const fetchTopics = async () => {
    try {
      // 1) Önce öğrencinin öğretmenini bul
      const { data: studentRelation, error: relationError } = await supabase
        .from("students")
        .select("teacher_id")
        .eq("student_id", profile?.user_id)
        .single();

      if (relationError) throw relationError;
      
      setTeacherId(studentRelation.teacher_id);

      // 2) Öğrenciye özel konuları getir
      const studentTopicsResponse = await supabase
        .from("topics")
        .select("*, resources (*)")
        .eq("student_id", profile?.user_id)
        .order("order_index");

      if (studentTopicsResponse.error) throw studentTopicsResponse.error;

      // 3) Tüm global konuları getir
      const globalTopicsResponse = await supabase
        .from("global_topics")
        .select(`*, global_topic_resources (*)`)
        .order("order_index");

      if (globalTopicsResponse.error) throw globalTopicsResponse.error;

      // 4) Kaynak ID'lerini topla
      const studentTopics = studentTopicsResponse.data || [];
      const globalTopics = globalTopicsResponse.data || [];

      // 5) Tüm tamamlanma verilerini getir
      const { data: completionResponse, error: completionError } = await supabase
        .from("student_resource_completion")
        .select("resource_id, is_completed, completed_at")
        .eq("student_id", profile?.user_id);

      if (completionError) {
        console.error("Completion data error:", completionError);
        throw completionError;
      }
      const completionData = completionResponse || [];

      const completionMap = new Map();
      completionData.forEach((completion) => {
        completionMap.set(completion.resource_id, completion);
      });

      // 6) Öğrenciye özel konuları işle
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
      }));

      // 7) Global konuları işle
      const processedGlobalTopics = globalTopics.map((topic) => {
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
          id: `global-${topic.id}`,
          title: topic.title,
          description: topic.description,
          is_completed: allResourcesCompleted,
          completed_at: allResourcesCompleted ? new Date().toISOString() : null,
          order_index: topic.order_index + 1000,
          resources: globalResources,
        };
      });

      const allTopics = [...processedStudentTopics, ...processedGlobalTopics];
      setTopics(allTopics);
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
  // UI FONKSİYONLARI
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

  const getVisibleResources = (topic: Topic) => {
    if (topic.is_completed) {
      return topic.resources;
    }
    return topic.resources.filter((resource: any) => resource.is_completed);
  };

  // ============================================================================
  // VERİ HAZIRLAMA
  // ============================================================================

  const completedTopics = topics.filter((t) => t.is_completed);
  const pendingTopics = topics.filter((t) => !t.is_completed && t.resources.some((r: any) => r.is_completed));
  const allActiveTopics = [...completedTopics, ...pendingTopics].sort((a, b) => a.order_index - b.order_index);

  // ============================================================================
  // RENDER - LOADING STATE
  // ============================================================================

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  // ============================================================================
  // RENDER - ANA İÇERİK
  // ============================================================================

  return (
    <div className="min-h-screen bg-background" data-area="dashboard" data-dashboard="student">
      {/* Header */}
      <Header
        rightActions={
          <>
            <NotificationBell 
              userId={profile?.user_id || ""}
              teacherId={teacherId}
              studentId={profile?.user_id}
              isStudent={true}
              onNotificationClick={() => setActiveTab("homework")}
            />
            <Button onClick={signOut} variant="outline" size="sm" disabled={signingOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{signingOut ? t("auth.signingOut") : t("auth.signOut")}</span>
            </Button>
          </>
        }
      >
        <div className="text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-card-foreground">{t("dashboard.student.title")}</h1>
          <p className="text-sm sm:text-lg text-card-foreground/70 hidden sm:block">{t("dashboard.student.welcome")}, {profile?.full_name}</p>
        </div>
      </Header>

      <div className="container mx-auto p-4">
        {/* İlerleme Özeti - 2x2 Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* İşlenen Konular */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8" />
                <div>
                  <p className="text-2xl font-bold">{allActiveTopics.length}</p>
                  <p className="text-sm opacity-70">{t("dashboard.student.processedTopics")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Toplam Kaynak */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8" />
                <div>
                  <p className="text-2xl font-bold">
                    {topics.reduce((acc, topic) => acc + getVisibleResources(topic).length, 0)}
                  </p>
                  <p className="text-sm opacity-70">{t("dashboard.student.totalResources")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* İşlenen Dersler */}
          <StudentLessonTracker studentId={profile?.user_id || ""} />

          {/* Derse Katıl */}
          <JoinLessonCard studentId={profile?.user_id || ""} />
        </div>

        {/* Tabs: Konular, Ödevler ve Ders Notları */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-2 border-b border-card-foreground/10 mb-4 overflow-x-auto pb-px">
              <Button
                variant={activeTab === "topics" ? "tab-active" : "tab-inactive"}
                className="rounded-b-none flex items-center gap-2 shrink-0"
                onClick={() => setActiveTab("topics")}
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">{t("dashboard.student.topics")}</span>
                <span className="sm:hidden">Konular</span>
              </Button>
              <Button
                variant={activeTab === "homework" ? "tab-active" : "tab-inactive"}
                className="rounded-b-none flex items-center gap-2 shrink-0"
                onClick={() => setActiveTab("homework")}
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">{t("dashboard.student.homework")}</span>
                <span className="sm:hidden">Ödevler</span>
              </Button>
              <Button
                variant={activeTab === "notes" ? "tab-active" : "tab-inactive"}
                className="rounded-b-none flex items-center gap-2 shrink-0"
                onClick={() => setActiveTab("notes")}
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">{t("lessonNotes.tabTitle")}</span>
                <span className="sm:hidden">Notlar</span>
              </Button>
            </div>

            {/* Konular Tab */}
            {activeTab === "topics" && (
              <>
                {allActiveTopics.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-5 w-5 text-card-foreground" />
                      <h3 className="text-lg font-semibold text-card-foreground">{t("dashboard.student.whatWeLearned")}</h3>
                    </div>
                    <p className="text-sm text-card-foreground/70 mb-4">{t("dashboard.student.learningMaterials")}</p>
                    {allActiveTopics.map((topic) => {
                      const visibleResources = getVisibleResources(topic);

                      return (
                        <div key={topic.id} className="border-l-4 border-l-primary bg-card-foreground/5 rounded-md p-4">
                          <Collapsible>
                            <div className="flex items-center justify-between">
                              <CollapsibleTrigger
                                className="flex items-center gap-2 flex-1 text-left"
                                onClick={() => toggleTopic(topic.id)}
                              >
                                {expandedTopics.has(topic.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-medium">{topic.title}</h4>
                                  {topic.description && (
                                    <p className="text-sm opacity-70">{topic.description}</p>
                                  )}
                                </div>
                              </CollapsibleTrigger>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{visibleResources.length} {t("common.resource")}</Badge>
                              </div>
                            </div>

                            {/* Kaynaklar */}
                            <CollapsibleContent className="mt-4">
                              <div className="pl-6 space-y-2">
                                <h5 className="font-medium text-sm">{t("common.resources")}</h5>
                                {visibleResources.length === 0 ? (
                                  <p className="text-sm opacity-70">
                                    {t("dashboard.student.noResourcesYet")}
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {visibleResources.map((resource: any) => (
                                      <div
                                        key={resource.id}
                                        className="flex items-center gap-3 p-2 bg-card-foreground/10 rounded-md"
                                      >
                                        {resource.is_completed ? (
                                          <CheckCircle className="h-4 w-4" />
                                        ) : (
                                          <Clock className="h-4 w-4 opacity-60" />
                                        )}
                                        {getResourceIcon(resource.resource_type)}
                                        <div className="flex-1">
                                          <button
                                            className="font-medium text-sm text-left hover:underline cursor-pointer"
                                            onClick={() => window.open(resource.resource_url, "_blank")}
                                          >
                                            {resource.title}
                                          </button>
                                          {resource.description && (
                                            <p className="text-xs opacity-70">{resource.description}</p>
                                          )}
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="card-ghost"
                                          onClick={() => window.open(resource.resource_url, "_blank")}
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto opacity-50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">{t("dashboard.student.noLearningActivity")}</h3>
                    <p className="opacity-70">
                      {t("dashboard.student.teacherWillAssign")}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Ödevler Tab */}
            {activeTab === "homework" && (
              <HomeworkSection 
                studentId={profile?.user_id || ""} 
                teacherId={teacherId}
                currentUserId={profile?.user_id || ""}
                uploadedByUserId={profile?.user_id || ""}
              />
            )}

            {/* Ders Notları Tab */}
            {activeTab === "notes" && (
              <LessonNotesSection 
                studentId={profile?.user_id || ""} 
                teacherId={teacherId}
                isTeacher={false}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
