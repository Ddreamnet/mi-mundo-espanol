// ============================================================================
// ÖĞRENCİ PANELİ - Modern Minimal Design
// ============================================================================

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  CheckCircle2,
  ExternalLink,
  FileText,
  Video,
  Link as LinkIcon,
  Upload,
  FolderOpen,
  GraduationCap,
} from "lucide-react";
import { Header } from "./Header";
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

      const { data: completionResponse, error: completionError } = await supabase
        .from("student_resource_completion")
        .select("resource_id, is_completed, completed_at")
        .eq("student_id", profile?.user_id);

      if (completionError) throw completionError;

      const completionMap = new Map();
      (completionResponse || []).forEach((c) => {
        completionMap.set(c.resource_id, c);
      });

      const processedStudentTopics = studentTopics.map((topic) => ({
        ...topic,
        resources: topic.resources
          .map((resource: any) => ({
            ...resource,
            is_completed: completionMap.get(resource.id)?.is_completed || false,
          }))
          .sort((a: Resource, b: Resource) => a.order_index - b.order_index),
      }));

      const processedGlobalTopics = globalTopics.map((topic) => {
        const globalResources = (topic.global_topic_resources || [])
          .map((res: any) => ({
            id: res.id,
            title: res.title,
            description: res.description,
            resource_type: res.resource_type,
            resource_url: res.resource_url,
            order_index: res.order_index,
            is_completed: completionMap.get(res.id)?.is_completed || false,
          }))
          .sort((a: Resource, b: Resource) => a.order_index - b.order_index);

        const allCompleted =
          globalResources.length > 0 && globalResources.every((r) => r.is_completed);

        return {
          id: `global-${topic.id}`,
          title: topic.title,
          description: topic.description,
          is_completed: allCompleted,
          completed_at: allCompleted ? new Date().toISOString() : null,
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
    if (topic.is_completed) return topic.resources;
    return topic.resources.filter((r: any) => r.is_completed);
  };

  const completedTopics = topics.filter((t) => t.is_completed);
  const pendingTopics = topics.filter(
    (t) => !t.is_completed && t.resources.some((r: any) => r.is_completed)
  );
  const allActiveTopics = [...completedTopics, ...pendingTopics].sort(
    (a, b) => a.order_index - b.order_index
  );

  const totalResources = topics.reduce(
    (acc, topic) => acc + getVisibleResources(topic).length,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header
        rightActions={
          <>
            <NotificationBell
              userId={profile?.user_id || ""}
              teacherId={teacherId}
              studentId={profile?.user_id}
              isStudent={true}
              onNotificationClick={() => setListDialogOpen(true)}
            />
            <ContactDialog />
            <Button onClick={signOut} variant="ghost" size="sm" disabled={signingOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{signingOut ? "..." : "Çıkış"}</span>
            </Button>
          </>
        }
      >
        <div className="text-center">
          <h1 className="text-lg sm:text-xl font-semibold text-header-foreground">
            Öğrenme Panelim
          </h1>
        </div>
      </Header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Stats Grid - Compact */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {/* Topics Count */}
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">{allActiveTopics.length}</p>
                  <p className="text-xs text-muted-foreground">Konu</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resources Count */}
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">{totalResources}</p>
                  <p className="text-xs text-muted-foreground">Kaynak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lesson Tracker */}
          <StudentLessonTracker studentId={profile?.user_id || ""} />

          {/* Homework Actions */}
          <Card className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex gap-2 h-full">
                <Button
                  variant="outline"
                  className="flex-1 h-full min-h-[60px] flex-col gap-1"
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-xs">Yükle</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-full min-h-[60px] flex-col gap-1"
                  onClick={() => setListDialogOpen(true)}
                >
                  <FolderOpen className="h-5 w-5" />
                  <span className="text-xs">Ödevler</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Topics Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Öğrenme Materyalleri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {allActiveTopics.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-card-foreground mb-1">Henüz içerik yok</h3>
                <p className="text-sm text-muted-foreground">
                  Öğretmeniniz materyalleri eklediğinde burada görünecek
                </p>
              </div>
            ) : (
              allActiveTopics.map((topic) => {
                const visibleResources = getVisibleResources(topic);
                const isExpanded = expandedTopics.has(topic.id);

                return (
                  <div
                    key={topic.id}
                    className={`rounded-lg border transition-colors ${
                      topic.is_completed
                        ? "border-success/30 bg-success/5"
                        : "border-border"
                    }`}
                  >
                    <Collapsible open={isExpanded} onOpenChange={() => toggleTopic(topic.id)}>
                      <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg">
                        <div className="flex items-center gap-3 text-left">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <h4 className="font-medium text-card-foreground">{topic.title}</h4>
                            {topic.description && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {topic.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={topic.is_completed ? "success" : "outline"}>
                          {visibleResources.length} kaynak
                        </Badge>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-2 space-y-2 ml-7">
                          {visibleResources.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">
                              Bu konu için henüz gösterilecek kaynak yok.
                            </p>
                          ) : (
                            visibleResources.map((resource: any) => (
                              <button
                                key={resource.id}
                                onClick={() => window.open(resource.resource_url, "_blank")}
                                className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left group"
                              >
                                <div className="p-1.5 rounded bg-card">
                                  {getResourceIcon(resource.resource_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-card-foreground group-hover:text-primary transition-colors truncate">
                                    {resource.title}
                                  </p>
                                  {resource.description && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {resource.description}
                                    </p>
                                  )}
                                </div>
                                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </main>

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
        currentUserId={profile?.user_id || ""}
      />
    </div>
  );
}
