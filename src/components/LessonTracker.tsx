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
import { useTranslation } from "react-i18next";
import { getRowConfig } from "@/lib/lessonTypes";
import { completeLesson, undoCompleteLesson } from "@/lib/lessonService";

interface InstanceData {
  id: string;
  lesson_number: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  status: string;
  original_date: string | null;
}

interface LessonTrackerProps {
  studentId: string;
  studentName: string;
  teacherId: string;
}

export function LessonTracker({ studentId, studentName, teacherId }: LessonTrackerProps) {
  const { t } = useTranslation();
  const [instances, setInstances] = useState<InstanceData[]>([]);
  const [lessonsPerWeek, setLessonsPerWeek] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingInstance, setPendingInstance] = useState<InstanceData | null>(null);
  const [confirmMode, setConfirmMode] = useState<"complete" | "undo">("complete");
  const { toast } = useToast();

  useEffect(() => {
    if (!studentId || !teacherId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [studentId, teacherId]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchInstances(), fetchLessonsPerWeek()]);
    setLoading(false);
  };

  const fetchInstances = async () => {
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

  const fetchLessonsPerWeek = async () => {
    try {
      const { data, error } = await supabase
        .from("student_lessons")
        .select("id")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId);

      if (error) throw error;
      setLessonsPerWeek(data?.length || 1);
    } catch (error: any) {
      console.error("Failed to fetch lessons per week:", error);
    }
  };

  const handleLessonClick = (instance: InstanceData) => {
    if (instance.status === "completed") {
      // Check if this is the last completed (undoable)
      const completedInstances = instances.filter(i => i.status === "completed");
      const lastCompleted = completedInstances[completedInstances.length - 1];
      if (lastCompleted && lastCompleted.id === instance.id) {
        setPendingInstance(instance);
        setConfirmMode("undo");
        setShowConfirm(true);
      }
      return;
    }

    // Check if this is the next completable (first planned)
    const firstPlanned = instances.find(i => i.status === "planned");
    if (!firstPlanned || firstPlanned.id !== instance.id) return;

    setPendingInstance(instance);
    setConfirmMode("complete");
    setShowConfirm(true);
  };

  const confirmAction = async () => {
    if (!pendingInstance) return;

    try {
      if (confirmMode === "complete") {
        const result = await completeLesson(pendingInstance.id, teacherId, studentId);
        if (!result.success) {
          throw new Error(result.error || "Failed to complete lesson");
        }
        toast({
          title: t("common.success"),
          description: t("lessonTracker.lessonMarked", { number: pendingInstance.lesson_number }),
        });
      } else {
        const result = await undoCompleteLesson(pendingInstance.id, teacherId, studentId);
        if (!result.success) {
          throw new Error(result.error || "Failed to undo lesson");
        }
        toast({
          title: t("common.success"),
          description: t("lessonTracker.lessonUndone", { number: pendingInstance.lesson_number }),
        });
      }

      // Refresh instances
      await fetchInstances();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setShowConfirm(false);
      setPendingInstance(null);
    }
  };

  const totalLessonsPerMonth = lessonsPerWeek * 4;
  const rowConfig = getRowConfig(lessonsPerWeek);

  // Derive completed count from instances
  const completedCount = instances.filter(i => i.status === "completed").length;

  // Find first planned for highlighting
  const firstPlannedId = instances.find(i => i.status === "planned")?.id;
  // Find last completed for undo highlighting
  const completedInstances = instances.filter(i => i.status === "completed");
  const lastCompletedId = completedInstances.length > 0 ? completedInstances[completedInstances.length - 1].id : null;

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

                  // Map display position to instance
                  const instance = instances[displayPosition - 1];
                  const isCompleted = instance?.status === "completed";
                  const isNextCompletable = instance?.id === firstPlannedId;
                  const isUndoable = instance?.id === lastCompletedId;
                  const isOverridden = instance?.original_date != null;
                  const displayDate = instance?.lesson_date;

                  return (
                    <div key={displayPosition} className="flex flex-col items-center gap-0.5">
                      <button
                        onClick={() => instance && handleLessonClick(instance)}
                        disabled={!instance || (instance.status === "planned" && instance.id !== firstPlannedId)}
                        className={`
                          h-8 w-8 rounded-lg border-2 transition-all duration-200 font-semibold text-xs
                          flex items-center justify-center shadow-sm relative
                          ${
                            isCompleted
                              ? isUndoable
                                ? "bg-secondary text-secondary-foreground border-secondary scale-95 shadow-md cursor-pointer hover:bg-destructive/20 hover:border-destructive"
                                : "bg-secondary text-secondary-foreground border-secondary scale-95 shadow-md"
                              : isNextCompletable
                                ? "bg-muted/50 border-primary/50 hover:bg-primary/10 hover:scale-105 hover:shadow-md cursor-pointer hover:border-primary ring-2 ring-primary/20"
                                : "bg-muted/50 border-border/50 opacity-60"
                          }
                        `}
                        title={
                          isCompleted
                            ? isUndoable
                              ? t("lessonTracker.clickToUndo", { number: displayPosition })
                              : t("lessonTracker.lessonCompleted", { number: displayPosition })
                            : t("lessonTracker.lesson", { number: displayPosition })
                        }
                      >
                        {displayPosition}
                      </button>
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
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmMode === "complete"
                ? t("lessonTracker.markLessonTitle")
                : t("lessonTracker.undoLessonTitle", { defaultValue: "Dersi Geri Al" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMode === "complete"
                ? t("lessonTracker.markLessonDescription", { name: studentName, number: pendingInstance?.lesson_number })
                : t("lessonTracker.undoLessonDescription", {
                    defaultValue: `${studentName} için ${pendingInstance?.lesson_number}. dersi geri almak istediğinize emin misiniz?`,
                    name: studentName,
                    number: pendingInstance?.lesson_number,
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setPendingInstance(null)}
              className="border-2 border-muted-foreground/30 bg-transparent text-card-foreground hover:bg-muted hover:border-muted-foreground/40"
            >
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={confirmMode === "undo" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
