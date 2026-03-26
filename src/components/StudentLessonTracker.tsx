import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BookCheck } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { LessonInstance, getRowConfig } from "@/lib/lessonTypes";

interface StudentLessonTrackerProps {
  studentId: string;
}

export function StudentLessonTracker({ studentId }: StudentLessonTrackerProps) {
  const { t } = useTranslation();
  const [instances, setInstances] = useState<LessonInstance[]>([]);
  const [templateCount, setTemplateCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("student-instance-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lesson_instances",
          filter: `student_id=eq.${studentId}`,
        },
        () => { fetchInstances(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [studentId]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchInstances(), fetchTemplateCount()]);
    setLoading(false);
  };

  const fetchInstances = async () => {
    try {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("teacher_id")
        .eq("student_id", studentId)
        .single();

      if (studentError) throw studentError;

      const { data: tracking } = await supabase
        .from("student_lesson_tracking")
        .select("package_cycle")
        .eq("student_id", studentId)
        .eq("teacher_id", studentData.teacher_id)
        .maybeSingle();

      const currentCycle = tracking?.package_cycle ?? 1;

      const { data, error } = await supabase
        .from("lesson_instances")
        .select("*")
        .eq("student_id", studentId)
        .eq("teacher_id", studentData.teacher_id)
        .eq("package_cycle", currentCycle)
        .in("status", ["planned", "completed"])
        .order("lesson_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      setInstances((data as LessonInstance[]) || []);
    } catch (error: any) {
      console.error("Failed to fetch lesson instances:", error);
    }
  };

  const fetchTemplateCount = async () => {
    try {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("teacher_id")
        .eq("student_id", studentId)
        .single();

      if (studentError) throw studentError;

      const { count } = await supabase
        .from("student_lessons")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .eq("teacher_id", studentData.teacher_id);

      setTemplateCount(count ?? 0);
    } catch (error: any) {
      console.error("Failed to fetch template count:", error);
    }
  };

  const totalLessonsPerMonth = templateCount * 4;
  const rowConfig = getRowConfig(templateCount);
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
                  const displayPosition = rowIndex * rowConfig.buttonsPerRow + colIndex;
                  if (displayPosition >= totalLessonsPerMonth) return null;

                  const inst = instances[displayPosition];
                  if (!inst) return null;

                  const isCompleted = inst.status === "completed";
                  const isRescheduled = inst.original_date !== null;

                  return (
                    <div key={inst.id} className="flex flex-col items-center gap-0.5">
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
                        title={`${t("lessonTracker.lesson", { number: displayPosition + 1 })}`}
                      >
                        {displayPosition + 1}
                      </div>
                      <span
                        className={`text-[10px] whitespace-nowrap ${
                          isRescheduled
                            ? "text-amber-600 dark:text-amber-400 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {format(new Date(inst.lesson_date), "dd.MM")}
                      </span>
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
