import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Download, Trash2, CheckCircle, Undo2, ChevronLeft, ChevronRight, Calendar, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddTrialLessonDialog } from "./AddTrialLessonDialog";
import { exportScheduleAsPNG } from "./ScheduleExportCanvas";
import { LessonOverrideDialog } from "./LessonOverrideDialog";
import { format, addDays } from "date-fns";
import { formatTime } from "@/lib/lessonTypes";
import { completeTrialLesson, undoTrialLesson } from "@/lib/lessonService";
import {
  getAllTimeSlots, getAllTimeSlotsActual, fetchActualLessonsForWeek,
  getWeekStartForOffset, clearWeekCache, prefetchWeek,
  dayIndexToDbDayOfWeek, getTrialLessonForDayAndTime as findTrialLesson,
  getActualLessonsForDayAndTime, getBackToBackGroupForLesson, isSecondaryInBackToBack,
  ActualLesson,
} from "@/hooks/useScheduleGrid";

interface StudentLesson {
  id: string;
  student_id: string;
  student_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  note?: string;
  _originalStartTime?: string;
  _originalEndTime?: string;
  _hasOverride?: boolean;
}

interface TrialLesson {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_completed: boolean;
  lesson_date: string;
}

interface AdminWeeklyScheduleProps {
  teacherId: string;
  refreshKey?: number;
}

const STUDENT_COLORS = [
  "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900 dark:border-blue-800",
  "bg-green-100 text-green-800 hover:bg-green-200 border-green-300 dark:bg-green-950 dark:text-green-200 dark:hover:bg-green-900 dark:border-green-800",
  "bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:hover:bg-purple-900 dark:border-purple-800",
  "bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:hover:bg-orange-900 dark:border-orange-800",
  "bg-pink-100 text-pink-800 hover:bg-pink-200 border-pink-300 dark:bg-pink-950 dark:text-pink-200 dark:hover:bg-pink-900 dark:border-pink-800",
  "bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-200 dark:hover:bg-cyan-900 dark:border-cyan-800",
];

const getDayLabel = (t: any) => [
  t("days.monday"), t("days.tuesday"), t("days.wednesday"),
  t("days.thursday"), t("days.friday"), t("days.saturday"), t("days.sunday"),
];

export function AdminWeeklySchedule({ teacherId, refreshKey }: AdminWeeklyScheduleProps) {
  const { t } = useTranslation();
  const [lessons, setLessons] = useState<StudentLesson[]>([]);
  const [trialLessons, setTrialLessons] = useState<TrialLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentColors, setStudentColors] = useState<Map<string, string>>(new Map());
  const [showAddTrial, setShowAddTrial] = useState(false);
  const [selectedTrialLesson, setSelectedTrialLesson] = useState<TrialLesson | null>(null);
  const [showTrialActionDialog, setShowTrialActionDialog] = useState(false);
  const [showMarkAlert, setShowMarkAlert] = useState(false);
  const [showUnmarkAlert, setShowUnmarkAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [actualLessons, setActualLessons] = useState<ActualLesson[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = getWeekStartForOffset(weekOffset);

  // Lesson override state
  const [selectedLesson, setSelectedLesson] = useState<StudentLesson | null>(null);
  const [selectedLessonDate, setSelectedLessonDate] = useState<Date | null>(null);
  const [selectedLessonCurrentDate, setSelectedLessonCurrentDate] = useState<Date | null>(null);
  const [selectedLessonCurrentStartTime, setSelectedLessonCurrentStartTime] = useState<string | null>(null);
  const [selectedLessonCurrentEndTime, setSelectedLessonCurrentEndTime] = useState<string | null>(null);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [selectedActualLesson, setSelectedActualLesson] = useState<ActualLesson | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (!showTemplate) {
      Promise.all([fetchSchedule(), fetchActualSchedule()]).then(() => {
        prefetchWeek(teacherId, getWeekStartForOffset(weekOffset + 1));
        prefetchWeek(teacherId, getWeekStartForOffset(weekOffset - 1));
      });
    } else {
      fetchSchedule();
    }
  }, [teacherId, refreshKey]);

  useEffect(() => {
    if (!showTemplate) {
      fetchActualSchedule();
      prefetchWeek(teacherId, getWeekStartForOffset(weekOffset + 1));
      prefetchWeek(teacherId, getWeekStartForOffset(weekOffset - 1));
    }
  }, [showTemplate, weekOffset]);

  useEffect(() => {
    if (!teacherId) return;
    const channel = supabase
      .channel('admin-trial-lessons-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trial_lessons', filter: `teacher_id=eq.${teacherId}` }, () => {
        clearWeekCache();
        fetchSchedule();
        if (!showTemplate) fetchActualSchedule();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [teacherId, showTemplate]);

  const fetchActualSchedule = async () => {
    const fetched = await fetchActualLessonsForWeek(teacherId, weekStart);
    setActualLessons(fetched);
    const newStudentIds = [...new Set(fetched.map(l => l.student_id))].filter(id => !studentColors.has(id));
    if (newStudentIds.length > 0) {
      const colorMap = new Map(studentColors);
      newStudentIds.forEach((id) => { colorMap.set(id, STUDENT_COLORS[colorMap.size % STUDENT_COLORS.length]); });
      setStudentColors(colorMap);
    }
  };

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const [studentsRes, trialRes] = await Promise.all([
        supabase.from("students").select("student_id").eq("teacher_id", teacherId).eq("is_archived", false),
        supabase.from("trial_lessons").select("*").eq("teacher_id", teacherId).order("start_time", { ascending: true }),
      ]);
      if (studentsRes.error) throw studentsRes.error;
      if (trialRes.error) throw trialRes.error;

      const activeStudentIds = (studentsRes.data || []).map(s => s.student_id);
      setTrialLessons(trialRes.data || []);

      const [lessonsRes, profilesRes] = await Promise.all([
        supabase.from("student_lessons")
          .select("id, student_id, day_of_week, start_time, end_time, note")
          .eq("teacher_id", teacherId)
          .in("student_id", activeStudentIds.length > 0 ? activeStudentIds : ['no-students']),
        supabase.from("profiles").select("user_id, full_name")
          .in("user_id", activeStudentIds.length > 0 ? activeStudentIds : ['no-students']),
      ]);
      if (lessonsRes.error) throw lessonsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const nameMap = new Map(profilesRes.data?.map((s) => [s.user_id, s.full_name]) || []);
      const studentIds = [...new Set(lessonsRes.data?.map((l) => l.student_id) || [])];
      const colorMap = new Map<string, string>();
      studentIds.forEach((id, index) => { colorMap.set(id, STUDENT_COLORS[index % STUDENT_COLORS.length]); });
      setStudentColors(colorMap);

      setLessons(lessonsRes.data?.map((lesson) => ({ ...lesson, student_name: nameMap.get(lesson.student_id) || "Bilinmeyen", note: lesson.note })) || []);
    } catch {
      toast({ title: t("common.error"), description: t("dialogs.weeklySchedule.loadError", { defaultValue: "Ders programı yüklenemedi" }), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = showTemplate
    ? getAllTimeSlots(lessons, [])
    : getAllTimeSlotsActual(actualLessons, trialLessons);

  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${format(weekStart, "dd.MM")} – ${format(weekEnd, "dd.MM.yyyy")}`;

  const handleActualLessonClick = (lesson: ActualLesson) => {
    const syntheticLesson: StudentLesson = {
      id: lesson.id,
      student_id: lesson.student_id,
      student_name: lesson.student_name,
      day_of_week: new Date(lesson.lesson_date).getDay(),
      start_time: lesson.original_start_time || lesson.start_time,
      end_time: lesson.original_end_time || lesson.end_time,
      _originalStartTime: lesson.original_start_time || lesson.start_time,
      _originalEndTime: lesson.original_end_time || lesson.end_time,
      _hasOverride: lesson.rescheduled_count > 0,
    };
    const originalDate = lesson.original_date ? new Date(lesson.original_date) : new Date(lesson.lesson_date);
    setSelectedLesson(syntheticLesson);
    setSelectedActualLesson(lesson);
    setSelectedLessonDate(originalDate);
    setSelectedLessonCurrentDate(new Date(lesson.lesson_date));
    setSelectedLessonCurrentStartTime(lesson.start_time);
    setSelectedLessonCurrentEndTime(lesson.end_time);
    setShowOverrideDialog(true);
  };

  const handleTrialLessonClick = (trial: TrialLesson) => {
    setSelectedTrialLesson(trial);
    setShowTrialActionDialog(true);
  };

  const handleOverrideSuccess = () => {
    clearWeekCache();
    fetchSchedule();
    if (!showTemplate) fetchActualSchedule();
  };

  const handleDeleteTrialLesson = async () => {
    if (!selectedTrialLesson) return;
    try {
      const { error } = await supabase.from("trial_lessons").delete().eq("id", selectedTrialLesson.id);
      if (error) throw error;
      toast({ title: t("common.success"), description: t("dialogs.trialLessonActions.lessonDeleted") });
      fetchSchedule();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setShowDeleteAlert(false);
      setShowTrialActionDialog(false);
      setSelectedTrialLesson(null);
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedTrialLesson) return;
    try {
      const result = await completeTrialLesson(selectedTrialLesson.id, teacherId);
      if (!result.success) throw new Error(result.error || "Failed");
      toast({ title: t("common.success"), description: t("dialogs.trialLessonActions.lessonMarked") });
      fetchSchedule();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setShowMarkAlert(false);
      setSelectedTrialLesson(null);
    }
  };

  const handleMarkIncomplete = async () => {
    if (!selectedTrialLesson) return;
    try {
      const result = await undoTrialLesson(selectedTrialLesson.id, teacherId);
      if (!result.success) throw new Error(result.error || "Failed");
      toast({ title: t("common.success"), description: t("dialogs.trialLessonActions.lessonUnmarked") });
      fetchSchedule();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setShowUnmarkAlert(false);
      setSelectedTrialLesson(null);
    }
  };

  const handleExportPNG = async () => {
    try {
      const colorRecord: Record<string, string> = {};
      studentColors.forEach((color, studentId) => { colorRecord[studentId] = color; });
      await exportScheduleAsPNG({ lessons: lessons.map(l => ({ ...l, is_completed: false })), trialLessons, studentColors: colorRecord });
      toast({ title: t("common.success"), description: t("dialogs.weeklySchedule.pngDownloaded") });
    } catch {
      toast({ title: t("common.error"), description: t("dialogs.weeklySchedule.pngError"), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  const DAYS = getDayLabel(t);

  if (lessons.length === 0 && trialLessons.length === 0 && actualLessons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-base sm:text-lg">{t("dialogs.weeklySchedule.title")}</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleExportPNG} size="sm" variant="outline" className="text-xs sm:text-sm">
                <Download className="h-4 w-4 mr-1 sm:mr-2" />{t("dialogs.weeklySchedule.downloadPng")}
              </Button>
              <Button onClick={() => setShowAddTrial(true)} size="sm" className="text-xs sm:text-sm">
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />{t("dialogs.weeklySchedule.addTrial")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">{t("dialogs.weeklySchedule.noScheduleForTeacher")}</CardContent>
        <AddTrialLessonDialog open={showAddTrial} onOpenChange={setShowAddTrial} teacherId={teacherId} onSuccess={fetchSchedule} />
      </Card>
    );
  }

  const renderCell = (dayIndex: number, timeSlot: string) => {
    if (showTemplate) {
      const dbDow = dayIndexToDbDayOfWeek(dayIndex);
      const lesson = lessons.find(l => l.day_of_week === dbDow && l.start_time === timeSlot);
      return (
        <td key={dayIndex} className="border border-border p-2">
          {lesson && (
            <div className={`w-full py-2 px-3 rounded border-2 ${studentColors.get(lesson.student_id) || "bg-muted text-muted-foreground border-border"}`}>
              <div className="text-center">
                <div className="font-medium text-xs">{lesson.note ? `${lesson.student_name} - ${lesson.note}` : lesson.student_name}</div>
                <div className="text-[10px] mt-1 font-mono">{formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}</div>
              </div>
            </div>
          )}
        </td>
      );
    }

    // Actual mode
    const slotLessons = getActualLessonsForDayAndTime(actualLessons, dayIndex, timeSlot, weekStart);
    const trialLesson = findTrialLesson(trialLessons, dayIndex, timeSlot, weekStart);
    const visibleLessons = slotLessons.filter(l => !isSecondaryInBackToBack(actualLessons, dayIndex, l.id, weekStart));

    if (visibleLessons.length === 0 && !trialLesson) {
      return <td key={dayIndex} className="border border-border p-2"></td>;
    }

    const isMulti = visibleLessons.length > 1 || (visibleLessons.length >= 1 && trialLesson);

    return (
      <td key={dayIndex} className="border border-border p-1">
        <div className="flex gap-0.5 h-full">
          {visibleLessons.map(al => {
            const b2bGroup = getBackToBackGroupForLesson(actualLessons, dayIndex, al.id, weekStart);
            return (
              <Button
                key={al.id}
                variant="outline"
                className={`${isMulti ? "flex-1 min-w-0 px-1 py-1" : "w-full py-2"} justify-center relative ${
                  al.isGhost ? "cursor-default" : "cursor-pointer"
                } ${!al.isGhost && al.status === "completed" ? "opacity-40" : ""} ${
                  !al.isGhost && al.is_manual_override ? "ring-2 ring-amber-400 ring-offset-1" : ""
                } ${studentColors.get(al.student_id) || "bg-muted text-muted-foreground"}`}
                onClick={() => !al.isGhost && handleActualLessonClick(al)}
              >
                {al.isGhost && <AlertCircle className="absolute top-1 right-1 h-3 w-3 text-amber-500" />}
                <div className="text-center truncate">
                  <div className={`font-medium flex items-center justify-center gap-1 ${isMulti ? "text-[10px]" : ""}`}>
                    {!al.isGhost && al.is_manual_override && <Calendar className="h-3 w-3 text-amber-600 shrink-0" />}
                    <span className="truncate">{al.student_name}</span>
                    {b2bGroup && <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">{b2bGroup.length}</Badge>}
                  </div>
                  <div className={`${isMulti ? "text-[9px]" : "text-xs"} mt-0.5 font-mono`}>
                    {formatTime(al.start_time)} - {formatTime(al.end_time)}
                  </div>
                </div>
              </Button>
            );
          })}
          {trialLesson && visibleLessons.length === 0 && (
            <Button
              variant="outline"
              className={`w-full py-2 border-2 transition-all ${
                trialLesson.is_completed
                  ? "bg-destructive/10 text-destructive/40 border-destructive/20 opacity-40"
                  : "bg-destructive/20 text-destructive border-destructive/50"
              }`}
              onClick={() => handleTrialLessonClick(trialLesson)}
            >
              <div className="text-center w-full">
                <div className="font-medium">{t("dialogs.weeklySchedule.trialLesson")}</div>
                <div className="text-xs mt-0.5 font-mono">{formatTime(trialLesson.start_time)} - {formatTime(trialLesson.end_time)}</div>
              </div>
            </Button>
          )}
        </div>
      </td>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-base sm:text-lg">{t("dialogs.weeklySchedule.title")}</CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label htmlFor="schedule-mode-admin" className="text-xs text-muted-foreground">{t("dialogs.weeklySchedule.actual", { defaultValue: "Güncel" })}</Label>
                <Switch id="schedule-mode-admin" checked={showTemplate} onCheckedChange={setShowTemplate} />
                <Label htmlFor="schedule-mode-admin" className="text-xs text-muted-foreground">{t("dialogs.weeklySchedule.permanent", { defaultValue: "Kalıcı" })}</Label>
              </div>
              <Button onClick={() => setShowAddTrial(true)} size="sm" className="text-xs sm:text-sm">
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />{t("dialogs.weeklySchedule.addTrial")}
              </Button>
            </div>
          </div>
          {!showTemplate && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {weekOffset !== 0 && (
                <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setWeekOffset(0)}>
                  {t("dialogs.weeklySchedule.thisWeek", { defaultValue: "Bu Hafta" })}
                </Button>
              )}
              <span className="text-sm font-medium text-muted-foreground min-w-[140px] text-center">{weekLabel}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="border border-border p-2 bg-muted font-medium text-sm">{t("dialogs.weeklySchedule.hour")}</th>
                  {DAYS.map((day) => (
                    <th key={day} className="border border-border p-2 bg-muted font-medium text-sm">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((timeSlot) => (
                  <tr key={timeSlot}>
                    <td className="border border-border p-2 text-center font-medium text-sm bg-muted">{formatTime(timeSlot)}</td>
                    {DAYS.map((_, dayIndex) => renderCell(dayIndex, timeSlot))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AddTrialLessonDialog
        open={showAddTrial}
        onOpenChange={setShowAddTrial}
        teacherId={teacherId}
        onSuccess={() => { clearWeekCache(); fetchSchedule(); if (!showTemplate) fetchActualSchedule(); }}
      />

      {/* Trial Lesson Action Dialog */}
      <Dialog open={showTrialActionDialog} onOpenChange={setShowTrialActionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dialogs.trialLessonActions.title")}</DialogTitle>
            <DialogDescription>
              {selectedTrialLesson && `${formatTime(selectedTrialLesson.start_time)} - ${formatTime(selectedTrialLesson.end_time)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            {selectedTrialLesson?.is_completed ? (
              <Button variant="outline" className="w-full justify-start gap-3" onClick={() => { setShowTrialActionDialog(false); setShowUnmarkAlert(true); }}>
                <Undo2 className="h-5 w-5 text-warning" />{t("trialLessonActions.undoComplete")}
              </Button>
            ) : (
              <Button variant="outline" className="w-full justify-start gap-3" onClick={() => { setShowTrialActionDialog(false); setShowMarkAlert(true); }}>
                <CheckCircle className="h-5 w-5 text-success" />{t("trialLessonActions.markComplete")}
              </Button>
            )}
            <Button variant="outline" className="w-full justify-start gap-3 text-destructive hover:text-destructive" onClick={() => { setShowTrialActionDialog(false); setShowDeleteAlert(true); }}>
              <Trash2 className="h-5 w-5" />{t("trialLessonActions.deleteTrialLesson")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showMarkAlert} onOpenChange={setShowMarkAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trialLessonActions.markConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("trialLessonActions.markConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkComplete}>{t("common.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnmarkAlert} onOpenChange={setShowUnmarkAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trialLessonActions.unmarkConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("trialLessonActions.unmarkConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkIncomplete}>{t("common.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trialLessonActions.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("trialLessonActions.deleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTrialLesson} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedLesson && selectedLessonDate && (
        <LessonOverrideDialog
          open={showOverrideDialog}
          onOpenChange={setShowOverrideDialog}
          studentId={selectedLesson.student_id}
          teacherId={teacherId}
          studentName={selectedLesson.student_name}
          originalDate={selectedLessonDate}
          originalDayOfWeek={selectedLesson.day_of_week}
          originalStartTime={selectedLesson._originalStartTime || selectedLesson.start_time}
          originalEndTime={selectedLesson._originalEndTime || selectedLesson.end_time}
          currentDate={selectedLessonCurrentDate || undefined}
          currentStartTime={selectedLessonCurrentStartTime || undefined}
          currentEndTime={selectedLessonCurrentEndTime || undefined}
          hasExistingOverride={selectedLesson._hasOverride || false}
          instanceId={selectedActualLesson?.id}
          onSuccess={handleOverrideSuccess}
        />
      )}
    </>
  );
}
