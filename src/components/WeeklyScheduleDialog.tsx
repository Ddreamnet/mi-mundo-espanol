import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, ChevronLeft, ChevronRight, Calendar, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { exportScheduleAsPNG } from "./ScheduleExportCanvas";
import { format, addDays } from "date-fns";
import { formatTime as sharedFormatTime } from "@/lib/lessonTypes";
import { completeTrialLesson, undoTrialLesson } from "@/lib/lessonService";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  dayIndexToDbDayOfWeek, getAllTimeSlots, getAllTimeSlotsActual,
  getTrialLessonForDayAndTime as findTrialLesson,
  fetchActualLessonsForWeek, getActualLessonsForDayAndTime,
  getBackToBackGroupForLesson, isSecondaryInBackToBack,
  getWeekStartForOffset, clearWeekCache, prefetchWeek,
  ActualLesson,
} from "@/hooks/useScheduleGrid";

interface StudentLesson {
  id: string;
  student_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  student_name: string;
  is_completed: boolean;
  note?: string;
}

interface TrialLesson {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_completed: boolean;
  lesson_date: string;
}

interface WeeklyScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
}

const STUDENT_COLORS = [
  "bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-200",
  "bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200",
  "bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200",
  "bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200",
  "bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-200",
  "bg-pink-100 border-pink-300 text-pink-900 dark:bg-pink-950 dark:border-pink-800 dark:text-pink-200",
  "bg-cyan-100 border-cyan-300 text-cyan-900 dark:bg-cyan-950 dark:border-cyan-800 dark:text-cyan-200",
  "bg-orange-100 border-orange-300 text-orange-900 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-200",
];

export function WeeklyScheduleDialog({ open, onOpenChange, teacherId }: WeeklyScheduleDialogProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [lessons, setLessons] = useState<StudentLesson[]>([]);
  const [trialLessons, setTrialLessons] = useState<TrialLesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentColors, setStudentColors] = useState<Record<string, string>>({});
  const [selectedTrialLesson, setSelectedTrialLesson] = useState<TrialLesson | null>(null);
  const [confirmAction, setConfirmAction] = useState<"complete" | "incomplete" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [actualLessons, setActualLessons] = useState<ActualLesson[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = getWeekStartForOffset(weekOffset);
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${format(weekStart, "dd.MM")} – ${format(weekEnd, "dd.MM.yyyy")}`;
  const { toast } = useToast();

  const formatTime = (time: string) => {
    const locale = language === 'tr' ? 'tr-TR' : language === 'es' ? 'es-ES' : 'en-US';
    return sharedFormatTime(time, locale);
  };

  const getDays = () => [
    t("days.monday"), t("days.tuesday"), t("days.wednesday"),
    t("days.thursday"), t("days.friday"), t("days.saturday"), t("days.sunday"),
  ];
  const DAYS = getDays();

  useEffect(() => {
    if (open && teacherId) fetchSchedule();
  }, [open, teacherId]);

  useEffect(() => {
    if (open && !showTemplate && teacherId) {
      fetchActualSchedule();
      prefetchWeek(teacherId, getWeekStartForOffset(weekOffset + 1));
      prefetchWeek(teacherId, getWeekStartForOffset(weekOffset - 1));
    }
  }, [open, showTemplate, teacherId, weekOffset]);

  useEffect(() => {
    if (!open || !teacherId) return;
    const channel = supabase.channel('trial-lessons-changes').on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'trial_lessons', filter: `teacher_id=eq.${teacherId}`
    }, () => {
      clearWeekCache();
      fetchSchedule();
      if (!showTemplate) fetchActualSchedule();
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, teacherId, showTemplate]);

  const fetchActualSchedule = async () => {
    const fetched = await fetchActualLessonsForWeek(teacherId, weekStart);
    setActualLessons(fetched);
    const newStudents = [...new Set(fetched.map(l => l.student_id))].filter(id => !studentColors[id]);
    if (newStudents.length > 0) {
      const colors = { ...studentColors };
      const existingCount = Object.keys(colors).length;
      newStudents.forEach((id, i) => { colors[id] = STUDENT_COLORS[(existingCount + i) % STUDENT_COLORS.length]; });
      setStudentColors(colors);
    }
  };

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const { data: activeStudents } = await supabase.from("students").select("student_id").eq("teacher_id", teacherId).eq("is_archived", false);
      const activeStudentIds = (activeStudents || []).map(s => s.student_id);

      const [lessonsRes, trialRes, profilesRes] = await Promise.all([
        supabase.from("student_lessons").select("id, student_id, day_of_week, start_time, end_time, is_completed, note").eq("teacher_id", teacherId).in("student_id", activeStudentIds.length > 0 ? activeStudentIds : ['no-students']),
        supabase.from("trial_lessons").select("id, day_of_week, start_time, end_time, is_completed, lesson_date").eq("teacher_id", teacherId),
        supabase.from("profiles").select("user_id, full_name").in("user_id", activeStudentIds.length > 0 ? activeStudentIds : ['no-students']),
      ]);

      setTrialLessons(trialRes.data || []);

      const nameMap: Record<string, string> = {};
      (profilesRes.data || []).forEach(p => { nameMap[p.user_id] = p.full_name; });

      const formatted: StudentLesson[] = (lessonsRes.data || []).map(l => ({
        ...l, student_name: nameMap[l.student_id] || "Bilinmeyen",
      }));
      setLessons(formatted);

      const uniqueStudents = [...new Set(formatted.map(l => l.student_id))];
      const colors: Record<string, string> = {};
      uniqueStudents.forEach((id, i) => { colors[id] = STUDENT_COLORS[i % STUDENT_COLORS.length]; });
      setStudentColors(colors);
    } catch {
      toast({ title: t("common.error"), description: t("dialogs.weeklySchedule.loadError", { defaultValue: "Ders programı yüklenemedi" }), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = showTemplate ? getAllTimeSlots(lessons, []) : getAllTimeSlotsActual(actualLessons, trialLessons);

  const handleTrialLessonClick = (lesson: TrialLesson) => {
    setSelectedTrialLesson(lesson);
    setConfirmAction(lesson.is_completed ? "incomplete" : "complete");
  };

  const handleMarkComplete = async () => {
    if (!selectedTrialLesson || processing) return;
    setProcessing(true);
    try {
      const result = await completeTrialLesson(selectedTrialLesson.id, teacherId);
      if (!result.success) throw new Error(result.error || "Failed");
      toast({ title: t("common.success"), description: t("dialogs.weeklySchedule.trialMarked") });
      await fetchSchedule();
    } catch {
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
      const result = await undoTrialLesson(selectedTrialLesson.id, teacherId);
      if (!result.success) throw new Error(result.error || "Failed");
      toast({ title: t("common.success"), description: t("dialogs.weeklySchedule.trialUnmarked") });
      await fetchSchedule();
    } catch {
      toast({ title: t("common.error"), description: t("dialogs.weeklySchedule.operationFailed"), variant: "destructive" });
    } finally {
      setSelectedTrialLesson(null);
      setConfirmAction(null);
      setProcessing(false);
    }
  };

  const handleExportPNG = async () => {
    try {
      await exportScheduleAsPNG({ lessons: lessons.map(l => ({ ...l })), trialLessons, studentColors });
      toast({ title: t("common.success"), description: t("dialogs.weeklySchedule.pngDownloaded") });
    } catch {
      toast({ title: t("common.error"), description: t("dialogs.weeklySchedule.pngError"), variant: "destructive" });
    }
  };

  const renderCell = (dayIndex: number, timeSlot: string) => {
    if (showTemplate) {
      const dbDow = dayIndexToDbDayOfWeek(dayIndex);
      const lesson = lessons.find(l => l.day_of_week === dbDow && l.start_time === timeSlot);
      return (
        <td key={dayIndex} className="border p-2">
          {lesson && (
            <div className={`p-2 rounded border-2 ${studentColors[lesson.student_id] || "bg-muted border-border"}`}>
              <div className="font-medium text-xs mb-1">{lesson.note ? `${lesson.student_name} - ${lesson.note}` : lesson.student_name}</div>
              <div className="text-[10px] font-mono">{formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}</div>
            </div>
          )}
        </td>
      );
    }

    // Actual mode
    const slotLessons = getActualLessonsForDayAndTime(actualLessons, dayIndex, timeSlot, weekStart);
    const trialLesson = findTrialLesson(trialLessons, dayIndex, timeSlot, weekStart);
    const visibleLessons = slotLessons.filter(l => !isSecondaryInBackToBack(actualLessons, dayIndex, l.id, weekStart));

    if (visibleLessons.length === 0 && !trialLesson) return <td key={dayIndex} className="border p-2"></td>;

    const isMulti = visibleLessons.length > 1;

    return (
      <td key={dayIndex} className="border p-1">
        <div className="flex gap-0.5 h-full">
          {visibleLessons.map(al => {
            const b2b = getBackToBackGroupForLesson(actualLessons, dayIndex, al.id, weekStart);
            return (
              <div key={al.id} className={`${isMulti ? 'flex-1 min-w-0' : 'w-full'} p-2 rounded border-2 transition-opacity relative ${
                al.status === "completed" && !al.isGhost ? "opacity-40" : "opacity-100"
              } ${!al.isGhost && al.is_manual_override ? "ring-2 ring-amber-400" : ""} ${
                studentColors[al.student_id] || "bg-muted border-border"
              }`}>
                {al.isGhost && <AlertCircle className="absolute top-1 right-1 h-3 w-3 text-amber-500" />}
                <div className={`font-medium ${isMulti ? 'text-[10px]' : 'text-xs'} mb-1 flex items-center gap-1`}>
                  {!al.isGhost && al.is_manual_override && <Calendar className="h-3 w-3 text-amber-600 shrink-0" />}
                  <span className="truncate">{al.student_name}</span>
                  {b2b && <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">{b2b.length}</Badge>}
                </div>
                <div className="text-[10px] font-mono">{formatTime(al.start_time)} - {formatTime(al.end_time)}</div>
              </div>
            );
          })}
          {trialLesson && visibleLessons.length === 0 && (
            <div onClick={() => !processing && handleTrialLessonClick(trialLesson)} className={`w-full p-2 rounded border-2 transition-all ${processing ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:opacity-80"} ${trialLesson.is_completed ? "bg-destructive/10 border-destructive/20 opacity-30" : "bg-destructive/20 border-destructive/50"}`}>
              <div className={`font-medium text-xs mb-1 ${trialLesson.is_completed ? "text-destructive/50" : "text-destructive"}`}>{t("dialogs.weeklySchedule.trialLesson")}</div>
              <div className={`text-[10px] font-mono ${trialLesson.is_completed ? "text-destructive/50" : "text-destructive"}`}>{formatTime(trialLesson.start_time)} - {formatTime(trialLesson.end_time)}</div>
            </div>
          )}
        </div>
      </td>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <DialogTitle className="text-base sm:text-lg">{t("dialogs.weeklySchedule.title")}</DialogTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label htmlFor="schedule-mode-teacher" className="text-xs text-muted-foreground">{t("dialogs.weeklySchedule.actual", { defaultValue: "Güncel" })}</Label>
                <Switch id="schedule-mode-teacher" checked={showTemplate} onCheckedChange={setShowTemplate} />
                <Label htmlFor="schedule-mode-teacher" className="text-xs text-muted-foreground">{t("dialogs.weeklySchedule.permanent", { defaultValue: "Kalıcı" })}</Label>
              </div>
              {lessons.length > 0 && (
                <Button onClick={handleExportPNG} size="sm" variant="outline" className="text-xs sm:text-sm mx-0 sm:mr-[15px]">
                  <Download className="h-4 w-4 mr-1 sm:mr-2" />{t("dialogs.weeklySchedule.downloadPng")}
                </Button>
              )}
            </div>
          </div>
          {!showTemplate && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 border border-dash-border" onClick={() => setWeekOffset((o) => o - 1)}>
                <ChevronLeft className="h-4 w-4 text-[hsl(var(--dash-primary))]" />
              </Button>
              {weekOffset !== 0 && (
                <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setWeekOffset(0)}>
                  {t("dialogs.weeklySchedule.thisWeek", { defaultValue: "Bu Hafta" })}
                </Button>
              )}
              <span className="text-sm font-medium text-muted-foreground min-w-[140px] text-center">{weekLabel}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 border border-dash-border" onClick={() => setWeekOffset((o) => o + 1)}>
                <ChevronRight className="h-4 w-4 text-[hsl(var(--dash-primary))]" />
              </Button>
            </div>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : lessons.length === 0 && actualLessons.length === 0 ? (
          <div className="text-center py-8 opacity-70">{t("dialogs.weeklySchedule.noLessons")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr>
                  <th className="border bg-primary/10 p-2 text-sm font-semibold w-24">{t("dialogs.weeklySchedule.hour")}</th>
                  {DAYS.map(day => <th key={day} className="border bg-primary/10 p-2 text-sm font-semibold">{day}</th>)}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(timeSlot => (
                  <tr key={timeSlot}>
                    <td className="border bg-muted/50 p-2 text-center text-sm font-mono">{formatTime(timeSlot)}</td>
                    {DAYS.map((_, dayIndex) => renderCell(dayIndex, timeSlot))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>

      <AlertDialog open={confirmAction === "complete"} onOpenChange={open => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.weeklySchedule.completeConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("dialogs.weeklySchedule.completeConfirmDesc")}</AlertDialogDescription>
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
            <AlertDialogDescription>{t("dialogs.weeklySchedule.incompleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkIncomplete}>{t("dialogs.weeklySchedule.markIncomplete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
