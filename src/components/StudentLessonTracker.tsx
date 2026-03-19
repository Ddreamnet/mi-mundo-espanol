import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BookCheck } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { getRowConfig } from "@/lib/lessonTypes";

interface InstanceData {
  id: string;
  lesson_number: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  status: string;
  original_date: string | null;
}

interface StudentLessonTrackerProps {
  studentId: string;
}

export function StudentLessonTracker({ studentId }: StudentLessonTrackerProps) {
  const { t } = useTranslation();
  const [lessonsPerWeek, setLessonsPerWeek] = useState<number>(1);
  const [instances, setInstances] = useState<InstanceData[]>([]);
  const [loading, setLoading] = useState(true);

  const getTeacherId = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("teacher_id")
        .eq("student_id", studentId)
        .single();
      if (error) throw error;
      return data.teacher_id;
    } catch (error) {
      console.error("Failed to fetch teacher_id:", error);
      return null;
    }
  }, [studentId]);

  useEffect(() => {
    const loadData = async () => {
      const teacherId = await getTeacherId();
      if (!teacherId) {
        setLoading(false);
        return;
      }
      await Promise.all([
        fetchInstances(teacherId),
        fetchLiveLessonsPerWeek(teacherId),
      ]);
      setLoading(false);
    };
    loadData();

    // Real-time subscription on lesson_instances
    const channel = supabase
      .channel("student-lesson-instances")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lesson_instances",
          filter: `student_id=eq.${studentId}`,
        },
        async () => {
          const teacherId = await getTeacherId();
          if (teacherId) {
            await fetchInstances(teacherId);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, getTeacherId]);

  const fetchInstances = async (teacherId: string) => {
    try {
      // Get current cycle
      const { data: tracking } = await supabase
        .from("student_lesson_tracking")
        .select("package_cycle")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId)
        .maybeSingle();

      const currentCycle = tracking?.package_cycle ?? 1;

      const { data, error } = await supabase
        .from("lesson_instances")
        .select("id, lesson_number, lesson_date, start_time, end_time, status, original_date")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId)
        .eq("package_cycle", currentCycle)
        .order("lesson_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      setInstances(data || []);
    } catch (error: any) {
      console.error("Failed to fetch lesson instances:", error);
    }
  };

  const fetchLiveLessonsPerWeek = async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from("student_lessons")
        .select("id")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId);

      if (error) throw error;
      if (data && data.length > 0) {
        setLessonsPerWeek(data.length);
      }
    } catch (error: any) {
      console.error("Failed to fetch live lessons per week:", error);
    }
  };

  const totalLessonsPerMonth = lessonsPerWeek * 4;
  const rowConfig = getRowConfig(lessonsPerWeek);
  const completedCount = instances.filter(i => i.status === "completed").length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse h-20 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 min-w-[100px]">
            <BookCheck className="h-8 w-8 flex-shrink-0" />
            <div>
              <p className="text-2x1 font-bold">
                {completedCount}/{totalLessonsPerMonth}
              </p>
              <p className="text-sm opacity-70">{t("common.processedLessons")}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            {Array.from({ length: rowConfig.rows }, (_, rowIndex) => (
              <div key={rowIndex} className="flex gap-1.5">
                {Array.from({ length: rowConfig.buttonsPerRow }, (_, colIndex) => {
                  const displayPosition = rowIndex * rowConfig.buttonsPerRow + colIndex + 1;
                  if (displayPosition > totalLessonsPerMonth) return null;

                  const instance = instances[displayPosition - 1];
                  const isCompleted = instance?.status === "completed";
                  const isOverridden = instance?.original_date != null;
                  const displayDate = instance?.lesson_date;

                  return (
                    <div key={displayPosition} className="flex flex-col items-center gap-0.5">
                      <div
                        className={`
                        h-8 w-8 rounded-lg border-2 transition-all duration-200
                        flex items-center justify-center text-xs font-semibold shadow-sm
                        ${
                          isCompleted
                            ? "bg-secondary text-secondary-foreground border-secondary scale-95 shadow-md"
                            : "bg-muted/50 border-border/50"
                        }
                      `}
                      >
                        {displayPosition}
                      </div>
                      {displayDate && (
                        <span className={`text-[10px] whitespace-nowrap ${
                          isOverridden ? "font-semibold" : "opacity-70"
                        }`}>
                          {format(new Date(displayDate + "T00:00:00"), "dd.MM")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
