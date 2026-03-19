import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportScheduleAsPNG } from "./ScheduleExportCanvas";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import type { StudentLesson, TrialLesson } from "@/types/lessons";
import { formatTime as formatTimeUtil } from "@/utils/lessonDateUtils";
import { addTrialLessonToBalance, subtractTrialLessonFromBalance } from "@/lib/teacherBalance";
import { useScheduleGrid } from "@/hooks/useScheduleGrid";

interface WeeklyScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
}

export function WeeklyScheduleDialog({
  open,
  onOpenChange,
  teacherId
}: WeeklyScheduleDialogProps) {
  const [selectedTrialLesson, setSelectedTrialLesson] = useState<TrialLesson | null>(null);
  const [confirmAction, setConfirmAction] = useState<"complete" | "incomplete" | null>(null);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { daysOfWeek, language } = useLanguage();

  const {
    lessons,
    trialLessons,
    studentColors,
    loading,
    refetch: refetchSchedule,
    getTrialLessonForDayAndTime,
  } = useScheduleGrid({ teacherId, autoFetch: false, channelSuffix: "teacher" });

  const DAYS = daysOfWeek.map(d => d.label);

  useEffect(() => {
    if (open && teacherId) {
      refetchSchedule();
    }
  }, [open, teacherId]);

  const formatTime = (time: string) => {
    const locale = language === 'tr' ? 'tr-TR' : language === 'es' ? 'es-ES' : 'en-US';
    return formatTimeUtil(time, locale);
  };

  const getAllTimeSlots = () => {
    const times = new Set<string>();
    lessons.forEach(lesson => {
      times.add(lesson.start_time);
    });
    trialLessons.forEach(lesson => {
      times.add(lesson.start_time);
    });
    return Array.from(times).sort();
  };

  const getLessonForDayAndTime = (dayIndex: number, timeSlot: string): StudentLesson | null => {
    const dbDayOfWeek = dayIndex === 6 ? 0 : dayIndex + 1;
    return lessons.find(l => l.day_of_week === dbDayOfWeek && l.start_time === timeSlot) || null;
  };

  const handleTrialLessonClick = (lesson: TrialLesson) => {
    setSelectedTrialLesson(lesson);
    setConfirmAction(lesson.is_completed ? "incomplete" : "complete");
  };

  const handleMarkComplete = async () => {
    if (!selectedTrialLesson || processing) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from("trial_lessons").update({ is_completed: true }).eq("id", selectedTrialLesson.id);
      if (error) throw error;
      await addTrialLessonToBalance(teacherId, selectedTrialLesson);
      toast({ title: t("common.success"), description: t("dialogs.weeklySchedule.trialMarked") });
      await refetchSchedule();
    } catch (error: any) {
      toast({ title: t("common.error"), description: t("dialogs.weeklySchedule.operationFailed"), variant: "destructive" });
    } finally {
      setSelectedTrialLesson(null);
      setConfirmAction(null);
      setProcessing(false);
    }
  };

  const handleMarkIncomplete = async () => {
    if (!selectedTrialLesson || processing) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from("trial_lessons").update({ is_completed: false }).eq("id", selectedTrialLesson.id);
      if (error) throw error;
      await subtractTrialLessonFromBalance(teacherId, selectedTrialLesson);
      toast({ title: t("common.success"), description: t("dialogs.weeklySchedule.trialUnmarked") });
      await refetchSchedule();
    } catch (error: any) {
      toast({ title: t("common.error"), description: t("dialogs.weeklySchedule.operationFailed"), variant: "destructive" });
    } finally {
      setSelectedTrialLesson(null);
      setConfirmAction(null);
      setProcessing(false);
    }
  };

  const timeSlots = getAllTimeSlots();

  const handleExportPNG = async () => {
    try {
      await exportScheduleAsPNG({
        lessons: lessons.map(l => ({ ...l, student_name: l.student_name })),
        trialLessons,
        studentColors
      });
      toast({ title: t("common.success"), description: t("dialogs.weeklySchedule.pngDownloaded") });
    } catch (error) {
      toast({ title: t("common.error"), description: t("dialogs.weeklySchedule.pngError"), variant: "destructive" });
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{t("dialogs.weeklySchedule.title")}</DialogTitle>
            {lessons.length > 0 && <Button onClick={handleExportPNG} size="sm" variant="outline" className="mx-0 mr-[15px]">
                <Download className="h-4 w-4 mr-2" />
                {t("dialogs.weeklySchedule.downloadPng")}
              </Button>}
          </div>
        </DialogHeader>

        {loading ? <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div> : lessons.length === 0 ? <div className="text-center py-8 opacity-70">
            {t("dialogs.weeklySchedule.noLessons")}
          </div> : <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr>
                  <th className="border bg-primary/10 p-2 text-sm font-semibold w-24">{t("dialogs.weeklySchedule.hour")}</th>
                  {DAYS.map(day => <th key={day} className="border bg-primary/10 p-2 text-sm font-semibold">
                      {day}
                    </th>)}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(timeSlot => <tr key={timeSlot}>
                    <td className="border bg-muted/50 p-2 text-center text-sm font-mono">
                      {formatTime(timeSlot)}
                    </td>
                    {DAYS.map((day, dayIndex) => {
                const lesson = getLessonForDayAndTime(dayIndex, timeSlot);
                const trialLesson = getTrialLessonForDayAndTime(dayIndex, timeSlot);
                return <td key={day} className="border p-2">
                          {lesson ? <div className={`p-2 rounded border-2 transition-opacity ${lesson.is_completed ? "opacity-40" : "opacity-100"} ${studentColors[lesson.student_id] || "bg-muted border-border"}`}>
                              <div className="font-medium text-xs mb-1">
                                {lesson.note ? `${lesson.student_name} - ${lesson.note}` : lesson.student_name}
                              </div>
                              <div className="text-[10px] font-mono">
                                {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                              </div>
                            </div> : trialLesson ? <div onClick={() => !processing && handleTrialLessonClick(trialLesson)} className={`p-2 rounded border-2 transition-all ${processing ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:opacity-80"} ${trialLesson.is_completed ? "bg-destructive/10 border-destructive/20 opacity-30" : "bg-destructive/20 border-destructive/50"}`}>
                              <div className={`font-medium text-xs mb-1 ${trialLesson.is_completed ? "text-destructive/50" : "text-destructive"}`}>
                                {t("dialogs.weeklySchedule.trialLesson")}
                              </div>
                              <div className={`text-[10px] font-mono ${trialLesson.is_completed ? "text-destructive/50" : "text-destructive"}`}>
                                {formatTime(trialLesson.start_time)} - {formatTime(trialLesson.end_time)}
                              </div>
                            </div> : null}
                        </td>;
              })}
                  </tr>)}
              </tbody>
            </table>
          </div>}
      </DialogContent>

      <AlertDialog open={confirmAction === "complete"} onOpenChange={open => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.weeklySchedule.completeConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.weeklySchedule.completeConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkComplete}>{t("dialogs.weeklySchedule.markComplete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === "incomplete"} onOpenChange={open => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.weeklySchedule.incompleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.weeklySchedule.incompleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkIncomplete}>{t("dialogs.weeklySchedule.markIncomplete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>;
}
