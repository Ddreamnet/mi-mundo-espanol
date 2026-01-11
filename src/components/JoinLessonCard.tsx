import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface JoinLessonCardProps {
  studentId: string;
}

export function JoinLessonCard({ studentId }: JoinLessonCardProps) {
  const { t } = useTranslation();
  const [lessonLink, setLessonLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLessonLink();

    // Set up real-time subscription for lesson link updates
    const channel = supabase
      .channel("lesson-link-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "students",
          filter: `student_id=eq.${studentId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            setLessonLink((payload.new as any).lesson_link);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId]);

  const fetchLessonLink = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("lesson_link")
        .eq("student_id", studentId)
        .single();

      if (error) throw error;
      setLessonLink(data?.lesson_link || null);
    } catch (error: any) {
      console.error("Failed to fetch lesson link:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLesson = () => {
    if (lessonLink) {
      window.open(lessonLink, "_blank");
    } else {
      toast({
        title: t("common.linkNotFound"),
        description: t("common.teacherNoLink"),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="animate-pulse bg-muted h-8 w-8 rounded" />
            <div className="flex-1">
              <div className="animate-pulse bg-muted h-4 w-24 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 h-full flex items-center">
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3">
            <Video className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">{t("common.liveLesson")}</p>
              <p className="text-sm text-muted-foreground">
                {lessonLink ? t("common.clickToJoin") : t("common.linkNotAdded")}
              </p>
            </div>
          </div>
          <Button 
            onClick={handleJoinLesson} 
            disabled={!lessonLink}
            className="shrink-0"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {t("common.joinLesson")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
