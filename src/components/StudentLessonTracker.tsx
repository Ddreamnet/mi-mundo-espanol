import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BookCheck, Ban } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import type { LessonDates, LessonOverrideBasic } from "@/types/lessons";
import {
  getSortedLessons,
  getDisplayLessonData,
} from "@/lib/lessonSorting";
import { getRowConfig } from "@/lib/lessonTypes";

interface StudentLessonTrackerProps {
  studentId: string;
}

export function StudentLessonTracker({ studentId }: StudentLessonTrackerProps) {
  const { t } = useTranslation();
  const [lessonsPerWeek, setLessonsPerWeek] = useState<number>(1);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [lessonDates, setLessonDates] = useState<LessonDates>({});
  const [lessonOverrides, setLessonOverrides] = useState<LessonOverrideBasic[]>([]);
  const [instanceStartTimes, setInstanceStartTimes] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  // Fetch teacher_id once and reuse for both data fetches
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
        fetchLessonOverrides(teacherId),
        fetchTracking(teacherId),
        fetchLiveLessonsPerWeek(teacherId),
        fetchInstanceStartTimes(teacherId),
      ]);
    };
    loadData();

    // Set up real-time subscription
    const channel = supabase
      .channel("lesson-tracking-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_lesson_tracking",
          filter: `student_id=eq.${studentId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            const data = payload.new as any;
            setCompletedLessons(data.completed_lessons || []);
            setLessonDates(data.lesson_dates || {});
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, getTeacherId]);

  const fetchLessonOverrides = async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from("lesson_overrides")
        .select("id, original_date, new_date, is_cancelled")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId);

      if (error) throw error;
      setLessonOverrides(data || []);
    } catch (error: any) {
      console.error("Failed to fetch lesson overrides:", error);
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

  const fetchInstanceStartTimes = async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from("lesson_instances")
        .select("lesson_number, start_time")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId)
        .in("status", ["planned", "completed"]);

      if (error) throw error;
      if (data) {
        const map = new Map<string, string>();
        for (const inst of data) {
          map.set(String(inst.lesson_number), inst.start_time);
        }
        setInstanceStartTimes(map);
      }
    } catch (error: any) {
      console.error("Failed to fetch instance start times:", error);
    }
  };

  const fetchTracking = async (teacherId: string) => {
    try {
      const { data: records, error } = await supabase
        .from("student_lesson_tracking")
        .select("*")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (records && records.length > 0) {
        const data = records[0];
        setCompletedLessons((data as any).completed_lessons || []);
        setLessonDates((data as any).lesson_dates || {});
        // lessonsPerWeek is set by fetchLiveLessonsPerWeek from template
      }
    } catch (error: any) {
      console.error("Failed to fetch lesson tracking:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalLessonsPerMonth = lessonsPerWeek * 4;
  const rowConfig = getRowConfig(lessonsPerWeek);
  const sortedLessons = getSortedLessons(lessonDates, lessonOverrides, totalLessonsPerMonth, instanceStartTimes);

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
                {completedLessons.length}/{totalLessonsPerMonth}
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

                  const lessonData = getDisplayLessonData(sortedLessons, lessonDates, displayPosition);
                  const { lessonNumber, displayDate, isCancelled, isOverridden } = lessonData;
                  const isCompleted = completedLessons.includes(lessonNumber);

                  return (
                    <div key={displayPosition} className="flex flex-col items-center gap-0.5">
                      <div
                        className={`
                        h-8 w-8 rounded-lg border-2 transition-all duration-200
                        flex items-center justify-center text-xs font-semibold shadow-sm
                        ${
                          isCancelled
                            ? "bg-muted border-border opacity-50"
                            : isCompleted
                              ? "bg-secondary text-secondary-foreground border-secondary scale-95 shadow-md"
                              : "bg-muted/50 border-border/50"
                        }
                      `}
                      >
                        {isCancelled ? <Ban className="h-4 w-4" /> : displayPosition}
                      </div>
                      {displayDate && (
                        <span className={`text-[10px] whitespace-nowrap ${
                          isOverridden ? "font-semibold" : "opacity-70"
                        }`}>
                          {format(new Date(displayDate), "dd.MM")}
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
