// ============================================================================
// ÖĞRENCİ PANELİ
// ============================================================================

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  Video,
  Link as LinkIcon,
  Upload,
  ClipboardList,
  GraduationCap,
} from "lucide-react";
import { PanelLayout, PanelCard, PanelCardTitle, PanelCardDescription, type SidebarItem } from "./panel";
import { StudentLessonTracker } from "./StudentLessonTracker";
import { UploadHomeworkDialog } from "./UploadHomeworkDialog";
import { HomeworkListDialog } from "./HomeworkListDialog";
import { ContactDialog } from "./ContactDialog";
import { NotificationBell } from "./NotificationBell";

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
}

export function StudentDashboard() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [teacherId, setTeacherId] = useState<string>("");
  const { profile, signOut, signingOut } = useAuth();
  const { toast } = useToast();

  // Sidebar items
  const sidebarItems: SidebarItem[] = [
    { id: "topics", label: "Konularım", icon: <BookOpen className="w-5 h-5" /> },
    { id: "homework", label: "Ödevlerim", icon: <ClipboardList className="w-5 h-5" /> },
  ];

  useEffect(() => {
    if (profile?.user_id) {
      fetchTopics();
    }
  }, [profile]);

  const fetchTopics = async () => {
    try {
      const { data: studentRelation, error: relationError } = await supabase
        .from("students")
        .select("teacher_id")
        .eq("student_id", profile?.user_id)
        .single();

      if (relationError) throw relationError;

      setTeacherId(studentRelation.teacher_id);

      const studentTopicsResponse = await supabase
        .from("topics")
        .select("*, resources (*)")
        .eq("student_id", profile?.user_id)
        .order("order_index");

      if (studentTopicsResponse.error) throw studentTopicsResponse.error;

      const globalTopicsResponse = await supabase
        .from("global_topics")
        .select(`*, global_topic_resources (*)`)
        .order("order_index");

      if (globalTopicsResponse.error) throw globalTopicsResponse.error;

      const studentTopics = studentTopicsResponse.data || [];
      const globalTopics = globalTopicsResponse.data || [];

      const studentResourceIds = studentTopics.flatMap((topic) => topic.resources.map((resource: any) => resource.id));
      const globalResourceIds = globalTopics.flatMap((topic) =>
        topic.global_topic_resources.map((resource: any) => resource.id)
      );

      const { data: completionResponse, error: completionError } = await supabase
        .from("student_resource_completion")
        .select("resource_id, is_completed, completed_at")
        .eq("student_id", profile?.user_id);

      if (completionError) throw completionError;

      const completionMap = new Map();
      (completionResponse || []).forEach((completion) => {
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
      }));

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

      setTopics([...processedStudentTopics, ...processedGlobalTopics]);
    } catch (error: any) {
      toast({
        title: "Hata",
        description: "Konular getirilemedi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
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
      default:
        return <ExternalLink className="h-4 w-4" />;
    }
  };

  const getVisibleResources = (topic: Topic) => {
    if (topic.is_completed) {
      return topic.resources;
    }
    return topic.resources.filter((resource: any) => resource.is_completed);
  };

  const handleSidebarClick = (id: string) => {
    if (id === "homework") {
      setListDialogOpen(true);
    }
  };

  const completedTopics = topics.filter((t) => t.is_completed);
  const pendingTopics = topics.filter((t) => !t.is_completed && t.resources.some((r: any) => r.is_completed));
  const allActiveTopics = [...completedTopics, ...pendingTopics].sort((a, b) => a.order_index - b.order_index);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <PanelLayout
        sidebarItems={sidebarItems}
        activeItem="topics"
        onItemClick={handleSidebarClick}
        title="Öğrenme Panelim"
        subtitle="İspanyolca öğrenme yolculuğun"
        userName={profile?.full_name}
        onLogout={signOut}
        isLoggingOut={signingOut}
        headerActions={
          <>
            <NotificationBell
              userId={profile?.user_id || ""}
              teacherId={teacherId}
              studentId={profile?.user_id}
              isStudent={true}
              onNotificationClick={() => setListDialogOpen(true)}
            />
            <ContactDialog />
          </>
        }
      >
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* İşlenen Konular */}
          <PanelCard hover>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-icon-on-light" />
              </div>
              <div>
                <p className="text-3xl font-bold text-card-foreground">{allActiveTopics.length}</p>
                <p className="text-sm text-card-foreground/60">İşlenen Konular</p>
              </div>
            </div>
          </PanelCard>

          {/* Toplam Kaynak */}
          <PanelCard hover>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-3xl font-bold text-card-foreground">
                  {topics.reduce((acc, topic) => acc + getVisibleResources(topic).length, 0)}
                </p>
                <p className="text-sm text-card-foreground/60">Toplam Kaynak</p>
              </div>
            </div>
          </PanelCard>

          {/* İşlenen Dersler */}
          <StudentLessonTracker studentId={profile?.user_id || ""} />

          {/* Ödev Kartı */}
          <PanelCard>
            <div className="grid grid-cols-2 gap-3 h-full">
              <Button
                variant="outline"
                className="h-full flex flex-col items-center justify-center gap-2 min-h-[80px]"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">Yükle</span>
              </Button>
              <Button
                variant="outline"
                className="h-full flex flex-col items-center justify-center gap-2 min-h-[80px]"
                onClick={() => setListDialogOpen(true)}
              >
                <ClipboardList className="h-6 w-6" />
                <span className="text-sm font-medium">Ödevler</span>
              </Button>
            </div>
          </PanelCard>
        </div>

        {/* Topics Section */}
        {allActiveTopics.length > 0 ? (
          <PanelCard padding="none">
            <div className="p-4 lg:p-5 border-b border-card-foreground/10">
              <PanelCardTitle icon={<GraduationCap className="w-5 h-5" />}>
                Öğrendiklerimiz
              </PanelCardTitle>
              <PanelCardDescription>Öğrenme materyallerin</PanelCardDescription>
            </div>
            <div className="p-4 lg:p-5 space-y-3">
              {allActiveTopics.map((topic) => {
                const visibleResources = getVisibleResources(topic);
                const isFullyCompleted = topic.is_completed;

                return (
                  <div
                    key={topic.id}
                    className={`rounded-xl border transition-all duration-200 ${
                      isFullyCompleted
                        ? "border-success/30 bg-success/5"
                        : "border-card-foreground/10 bg-card-foreground/[0.02]"
                    }`}
                  >
                    <Collapsible>
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <CollapsibleTrigger
                            className="flex items-center gap-3 flex-1 text-left"
                            onClick={() => toggleTopic(topic.id)}
                          >
                            {expandedTopics.has(topic.id) ? (
                              <ChevronDown className="h-4 w-4 text-card-foreground/60" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-card-foreground/60" />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium text-card-foreground">{topic.title}</h4>
                              {topic.description && (
                                <p className="text-sm text-card-foreground/60 mt-0.5">{topic.description}</p>
                              )}
                            </div>
                          </CollapsibleTrigger>
                          <Badge variant={isFullyCompleted ? "success" : "secondary"}>
                            {visibleResources.length} kaynak
                          </Badge>
                        </div>
                      </div>

                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-0">
                          <div className="pl-7 space-y-2 border-t border-card-foreground/10 pt-3">
                            {visibleResources.length === 0 ? (
                              <p className="text-sm text-card-foreground/60">
                                Bu konu için henüz gösterilecek kaynak bulunmuyor.
                              </p>
                            ) : (
                              visibleResources.map((resource: any) => (
                                <div
                                  key={resource.id}
                                  className="flex items-center gap-3 p-2.5 rounded-lg bg-card-foreground/[0.03] hover:bg-card-foreground/[0.06] transition-colors"
                                >
                                  {resource.is_completed ? (
                                    <CheckCircle className="h-4 w-4 text-success" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-card-foreground/40" />
                                  )}
                                  <span className="text-card-foreground/60">
                                    {getResourceIcon(resource.resource_type)}
                                  </span>
                                  <div className="flex-1">
                                    <button
                                      className="font-medium text-sm text-left hover:text-primary cursor-pointer text-card-foreground"
                                      onClick={() => window.open(resource.resource_url, "_blank")}
                                    >
                                      {resource.title}
                                    </button>
                                    {resource.description && (
                                      <p className="text-xs text-card-foreground/60">{resource.description}</p>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          </PanelCard>
        ) : (
          <PanelCard className="py-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-card-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-card-foreground mb-2">Henüz konu yok</h3>
            <p className="text-card-foreground/60">
              Öğretmeniniz konu eklediğinde burada görünecek.
            </p>
          </PanelCard>
        )}
      </PanelLayout>

      {/* Dialogs */}
      <UploadHomeworkDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        studentId={profile?.user_id || ""}
        teacherId={teacherId}
      />

      <HomeworkListDialog
        open={listDialogOpen}
        onOpenChange={setListDialogOpen}
        studentId={profile?.user_id || ""}
        teacherId={teacherId}
        isTeacher={false}
        currentUserId={profile?.user_id || ""}
      />
    </>
  );
}
