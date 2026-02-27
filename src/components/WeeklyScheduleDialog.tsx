import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download, Calendar } from "lucide-react";
import { exportScheduleAsPNG } from "./ScheduleExportCanvas";
import { useLessonOverrides, getLessonDateForCurrentWeek, LessonOverride } from "@/hooks/useLessonOverrides";
import { format, startOfWeek, addDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import type { StudentLesson, TrialLesson } from "@/types/lessons";
import { formatTime as formatTimeUtil } from "@/utils/lessonDateUtils";
import { addTrialLessonToBalance, subtractTrialLessonFromBalance } from "@/services/teacherBalanceService";
interface WeeklyScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
}
const STUDENT_COLORS = ["schedule-color-1", "schedule-color-2", "schedule-color-3", "schedule-color-4", "schedule-color-5", "schedule-color-6", "schedule-color-7", "schedule-color-8", "schedule-color-9", "schedule-color-10"];
export function WeeklyScheduleDialog({
  open,
  onOpenChange,
  teacherId
}: WeeklyScheduleDialogProps) {
  const [lessons, setLessons] = useState<StudentLesson[]>([]);
  const [trialLessons, setTrialLessons] = useState<TrialLesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentColors, setStudentColors] = useState<Record<string, string>>({});
  const [selectedTrialLesson, setSelectedTrialLesson] = useState<TrialLesson | null>(null);
  const [confirmAction, setConfirmAction] = useState<"complete" | "incomplete" | null>(null);
  const [processing, setProcessing] = useState(false);
  const {
    toast
  } = useToast();
  const { t } = useTranslation();
  const { daysOfWeek, language } = useLanguage();
  const { overrides, isLessonCancelled, getLessonOverride, refetch: refetchOverrides } = useLessonOverrides(teacherId);
  const DAYS = daysOfWeek.map(d => d.label);
  useEffect(() => {
    if (open && teacherId) {
      fetchSchedule();
      refetchOverrides();
    }
  }, [open, teacherId]);

  // Real-time listener for trial lesson updates
  useEffect(() => {
    if (!open || !teacherId) return;
    const channel = supabase.channel('trial-lessons-changes').on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'trial_lessons',
      filter: `teacher_id=eq.${teacherId}`
    }, () => {
      // Refetch schedule when trial lesson is updated
      fetchSchedule();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, teacherId]);
  const fetchSchedule = async () => {
    setLoading(true);
    try {
      // First, get non-archived students for this teacher
      const {
        data: activeStudents,
        error: studentsError
      } = await supabase.from("students").select("student_id").eq("teacher_id", teacherId).eq("is_archived", false);
      if (studentsError) throw studentsError;
      
      const activeStudentIds = (activeStudents || []).map(s => s.student_id);
      
      // First, fetch the lessons only for active students
      const {
        data: lessonsData,
        error: lessonsError
      } = await supabase.from("student_lessons").select("id, student_id, day_of_week, start_time, end_time, is_completed, note").eq("teacher_id", teacherId).in("student_id", activeStudentIds.length > 0 ? activeStudentIds : ['no-students']).order("start_time", {
        ascending: true
      });
      if (lessonsError) throw lessonsError;

      // Fetch trial lessons
      const {
        data: trialLessonsData,
        error: trialLessonsError
      } = await supabase.from("trial_lessons").select("id, day_of_week, start_time, end_time, is_completed").eq("teacher_id", teacherId).order("start_time", {
        ascending: true
      });
      if (trialLessonsError) throw trialLessonsError;
      setTrialLessons(trialLessonsData || []);

      // Then fetch student names separately
      const studentIds = Array.from(new Set((lessonsData || []).map(l => l.student_id)));
      const {
        data: profilesData,
        error: profilesError
      } = await supabase.from("profiles").select("user_id, full_name").in("user_id", studentIds.length > 0 ? studentIds : ['no-students']);
      if (profilesError) throw profilesError;

      // Create a map of student_id to full_name
      const studentNameMap: Record<string, string> = {};
      (profilesData || []).forEach(profile => {
        studentNameMap[profile.user_id] = profile.full_name;
      });
      const formattedLessons: StudentLesson[] = (lessonsData || []).map(lesson => ({
        id: lesson.id,
        student_id: lesson.student_id,
        day_of_week: lesson.day_of_week,
        start_time: lesson.start_time,
        end_time: lesson.end_time,
        student_name: studentNameMap[lesson.student_id] || "Bilinmeyen",
        is_completed: lesson.is_completed,
        note: lesson.note
      }));
      setLessons(formattedLessons);

      // Assign colors to students
      const uniqueStudents = Array.from(new Set(formattedLessons.map(l => l.student_id)));
      const colors: Record<string, string> = {};
      uniqueStudents.forEach((studentId, index) => {
        colors[studentId] = STUDENT_COLORS[index % STUDENT_COLORS.length];
      });
      setStudentColors(colors);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("dialogs.weeklySchedule.scheduleLoadError"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const formatTime = (time: string) => {
    const locale = language === 'tr' ? 'tr-TR' : language === 'es' ? 'es-ES' : 'en-US';
    return formatTimeUtil(time, locale);
  };
  // Get the date for a specific day in the current week
  const getDateForDayIndex = (dayIndex: number): Date => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    return addDays(weekStart, dayIndex);
  };

  const getAllTimeSlots = () => {
    const times = new Set<string>();
    
    // Add regular lesson times, considering overrides
    lessons.forEach(lesson => {
      const lessonDate = getLessonDateForCurrentWeek(lesson.day_of_week);
      const override = getLessonOverride(lesson.student_id, lessonDate);
      
      if (!isLessonCancelled(lesson.student_id, lessonDate)) {
        if (override && override.new_start_time) {
          times.add(override.new_start_time);
        } else {
          times.add(lesson.start_time);
        }
      }
    });
    
    trialLessons.forEach(lesson => {
      times.add(lesson.start_time);
    });
    
    // Add moved lessons that might have different times
    overrides.forEach((o) => {
      if (!o.is_cancelled && o.new_start_time) {
        times.add(o.new_start_time);
      }
    });
    
    return Array.from(times).sort();
  };
  
  const getLessonForDayAndTime = (dayIndex: number, timeSlot: string): (StudentLesson & { _isOverride?: boolean; _override?: LessonOverride }) | null => {
    // dayIndex: 0=Pazartesi, 6=Pazar
    // day_of_week in DB: 1=Pazartesi, 0=Pazar
    const dbDayOfWeek = dayIndex === 6 ? 0 : dayIndex + 1;
    const dateForDay = getDateForDayIndex(dayIndex);
    
    // First check if there's a moved lesson that should appear here
    const movedLesson = overrides.find((o) => {
      if (o.is_cancelled || !o.new_date) return false;
      const newDate = new Date(o.new_date);
      const effectiveTime = o.new_start_time || o.original_start_time;
      return format(newDate, "yyyy-MM-dd") === format(dateForDay, "yyyy-MM-dd") && effectiveTime === timeSlot;
    });
    
    if (movedLesson) {
      // Find the original lesson
      const originalLesson = lessons.find((l) => l.student_id === movedLesson.student_id);
      if (originalLesson) {
        return {
          ...originalLesson,
          start_time: movedLesson.new_start_time || movedLesson.original_start_time,
          end_time: movedLesson.new_end_time || movedLesson.original_end_time,
          _isOverride: true,
          _override: movedLesson,
        };
      }
    }
    
    // Check for regular lessons on this day
    const lesson = lessons.find(l => l.day_of_week === dbDayOfWeek && l.start_time === timeSlot);
    
    if (lesson) {
      const lessonDate = getLessonDateForCurrentWeek(lesson.day_of_week);
      
      // Check if this lesson is cancelled or moved
      if (isLessonCancelled(lesson.student_id, lessonDate)) {
        return null;
      }
      
      const override = getLessonOverride(lesson.student_id, lessonDate);
      if (override && override.new_date) {
        // This lesson is moved, don't show it here
        return null;
      }
      
      return lesson;
    }
    
    return null;
  };
  
  const getTrialLessonForDayAndTime = (dayIndex: number, timeSlot: string) => {
    const dbDayOfWeek = dayIndex === 6 ? 0 : dayIndex + 1;
    return trialLessons.find(l => l.day_of_week === dbDayOfWeek && l.start_time === timeSlot);
  };
  const handleTrialLessonClick = (lesson: TrialLesson) => {
    setSelectedTrialLesson(lesson);
    setConfirmAction(lesson.is_completed ? "incomplete" : "complete");
  };
  const handleMarkComplete = async () => {
    if (!selectedTrialLesson || processing) return;
    setProcessing(true);
    try {
      const {
        error
      } = await supabase.from("trial_lessons").update({
        is_completed: true
      }).eq("id", selectedTrialLesson.id);
      if (error) throw error;

      await addTrialLessonToBalance(teacherId, selectedTrialLesson);
      toast({
        title: t("common.success"),
        description: t("dialogs.weeklySchedule.trialMarked")
      });
      await fetchSchedule();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("dialogs.weeklySchedule.operationFailed"),
        variant: "destructive"
      });
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
      const {
        error
      } = await supabase.from("trial_lessons").update({
        is_completed: false
      }).eq("id", selectedTrialLesson.id);
      if (error) throw error;

      await subtractTrialLessonFromBalance(teacherId, selectedTrialLesson);
      toast({
        title: t("common.success"),
        description: t("dialogs.weeklySchedule.trialUnmarked")
      });
      await fetchSchedule();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("dialogs.weeklySchedule.operationFailed"),
        variant: "destructive"
      });
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
        lessons: lessons.map(l => ({
          ...l,
          student_name: l.student_name
        })),
        trialLessons,
        studentColors
      });
      toast({
        title: t("common.success"),
        description: t("dialogs.weeklySchedule.pngDownloaded")
      });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("dialogs.weeklySchedule.pngError"),
        variant: "destructive"
      });
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
                const isOverride = lesson && '_isOverride' in lesson && lesson._isOverride;
                return <td key={day} className="border p-2">
                          {lesson ? <div className={`p-2 rounded border-2 transition-opacity ${lesson.is_completed ? "opacity-40" : "opacity-100"} ${isOverride ? "ring-2 ring-warning" : ""} ${studentColors[lesson.student_id] || "bg-muted border-border"}`}>
                              <div className="font-medium text-xs mb-1 flex items-center gap-1">
                                {isOverride && <Calendar className="h-3 w-3 text-warning" />}
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