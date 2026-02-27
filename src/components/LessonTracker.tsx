import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Ban } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LessonDates, LessonOverrideBasic } from "@/types/lessons";
import {
  getSortedLessons,
  getDisplayLessonData,
  getRowConfig,
  calculateLessonDates,
} from "@/utils/lessonDateUtils";
import { addRegularLessonToBalance } from "@/services/teacherBalanceService";

interface LessonTrackerProps {
  studentId: string;
  studentName: string;
  teacherId: string;
}

export function LessonTracker({ studentId, studentName, teacherId }: LessonTrackerProps) {
  const { t } = useTranslation();
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [lessonDates, setLessonDates] = useState<LessonDates>({});
  const [studentLessonDays, setStudentLessonDays] = useState<number[]>([]);
  const [lessonOverrides, setLessonOverrides] = useState<LessonOverrideBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingLesson, setPendingLesson] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!studentId || !teacherId) {
      setLoading(false);
      return;
    }
    
    const loadData = async () => {
      await fetchStudentSchedule();
      await fetchLessonOverrides();
      await fetchTracking();
    };
    loadData();
  }, [studentId, teacherId]);

  const fetchStudentSchedule = async () => {
    try {
      const { data, error } = await supabase
        .from("student_lessons")
        .select("day_of_week")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId)
        .order("day_of_week");

      if (error) throw error;
      setStudentLessonDays(data.map((lesson: any) => lesson.day_of_week));
    } catch (error: any) {
      console.error("Failed to fetch student schedule:", error);
    }
  };

  const fetchLessonOverrides = async () => {
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

  const fetchTracking = async () => {
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
      } else {
        const { data: lessonsData } = await supabase
          .from("student_lessons")
          .select("id")
          .eq("student_id", studentId)
          .eq("teacher_id", teacherId);

        const lessonsPerWeek = lessonsData?.length || 1;

        const { data: newData, error: insertError } = await supabase
          .from("student_lesson_tracking")
          .insert({
            student_id: studentId,
            teacher_id: teacherId,
            lessons_per_week: lessonsPerWeek,
            completed_lessons: [],
            lesson_dates: {},
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (newData) {
          setCompletedLessons((newData as any).completed_lessons || []);
          setLessonDates((newData as any).lesson_dates || {});
        }
      }
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("lessonTracker.loadError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLessonClick = (lessonNumber: number) => {
    if (completedLessons.includes(lessonNumber)) return;
    setPendingLesson(lessonNumber);
    setShowConfirm(true);
  };

  const confirmLessonComplete = async () => {
    if (pendingLesson === null) return;

    try {
      if (studentLessonDays.length === 0) {
        toast({
          title: t("common.error"),
          description: t("lessonTracker.daysNotLoaded"),
          variant: "destructive",
        });
        setShowConfirm(false);
        setPendingLesson(null);
        return;
      }

      const newCompletedLessons = [...completedLessons, pendingLesson].sort((a, b) => a - b);
      let newLessonDates = { ...lessonDates };

      if (Object.keys(lessonDates).length === 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        newLessonDates = calculateLessonDates(pendingLesson, today, studentLessonDays);
        
        if (Object.keys(newLessonDates).length === 0) {
          toast({
            title: t("common.error"), 
            description: t("lessonTracker.datesCalculationError"),
            variant: "destructive",
          });
          setShowConfirm(false);
          setPendingLesson(null);
          return;
        }
      }

      const { data: existingRecords } = await supabase
        .from("student_lesson_tracking")
        .select("id")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (!existingRecords || existingRecords.length === 0) {
        throw new Error(t("lessonTracker.trackingNotFound"));
      }

      const { error } = await supabase
        .from("student_lesson_tracking")
        .update({
          completed_lessons: newCompletedLessons,
          lesson_dates: newLessonDates,
        })
        .eq("id", existingRecords[0].id);

      if (error) throw error;

      await addRegularLessonToBalance(teacherId, studentId);

      setCompletedLessons(newCompletedLessons);
      setLessonDates(newLessonDates);
      toast({
        title: t("common.success"),
        description: t("lessonTracker.lessonMarked", { number: pendingLesson }),
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setShowConfirm(false);
      setPendingLesson(null);
    }
  };

  const totalLessonsPerMonth = studentLessonDays.length * 4;
  const rowConfig = getRowConfig(studentLessonDays.length);
  const sortedLessons = getSortedLessons(lessonDates, lessonOverrides, totalLessonsPerMonth);

  if (loading) {
    return <div className="animate-pulse h-40 bg-muted rounded-lg"></div>;
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 border-2 border-border rounded-xl p-2.5 bg-secondary/20 shadow-sm">
          <div className="flex flex-col gap-1.5">
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
                      <button
                        onClick={() => handleLessonClick(lessonNumber)}
                        disabled={isCompleted || isCancelled}
                        className={`
                          h-8 w-8 rounded-lg border-2 transition-all duration-200 font-semibold text-xs
                          flex items-center justify-center shadow-sm relative
                          ${
                            isCancelled
                              ? "bg-muted opacity-50 border-border cursor-not-allowed"
                              : isCompleted
                                ? "bg-secondary text-secondary-foreground border-secondary scale-95 shadow-md"
                                : "bg-muted/50 border-border/50 hover:bg-primary/10 hover:scale-105 hover:shadow-md cursor-pointer hover:border-primary"
                          }
                        `}
                        title={isCancelled ? t("lessonTracker.lessonCancelled", { number: displayPosition }) : t("lessonTracker.lesson", { number: displayPosition })}
                      >
                        {isCancelled ? <Ban className="h-4 w-4" /> : displayPosition}
                      </button>
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
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("lessonTracker.markLessonTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("lessonTracker.markLessonDescription", { name: studentName, number: pendingLesson })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingLesson(null)} className="border-2 border-muted-foreground/30 bg-transparent text-card-foreground hover:bg-muted hover:border-muted-foreground/40">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLessonComplete}>{t("common.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
