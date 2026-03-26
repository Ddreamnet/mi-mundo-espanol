import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowRight, CalendarClock, RotateCcw, Save } from "lucide-react";
import { format, addDays } from "date-fns";
import { tr, enUS, es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { checkTeacherConflicts } from "@/lib/conflictDetection";
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
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import { shiftLessonsForward } from "@/lib/instanceGeneration";

interface LessonOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  teacherId: string;
  studentName: string;
  // Instance-based props
  instanceId?: string;
  originalDate: Date;
  originalDayOfWeek: number;
  originalStartTime: string;
  originalEndTime: string;
  // Current display date/time (might differ if already rescheduled)
  currentDate?: Date;
  currentStartTime?: string;
  currentEndTime?: string;
  hasExistingOverride?: boolean;
  onSuccess: () => void;
}

export function LessonOverrideDialog({
  open,
  onOpenChange,
  studentId,
  teacherId,
  studentName,
  instanceId,
  originalDate,
  originalDayOfWeek,
  originalStartTime,
  originalEndTime,
  currentDate,
  currentStartTime,
  currentEndTime,
  hasExistingOverride = false,
  onSuccess,
}: LessonOverrideDialogProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  
  const displayDate = currentDate || originalDate;
  const displayStartTime = currentStartTime || originalStartTime;
  const displayEndTime = currentEndTime || originalEndTime;

  const [newDate, setNewDate] = useState<Date | undefined>(displayDate);
  const [newStartTime, setNewStartTime] = useState(displayStartTime.slice(0, 5));
  const [newEndTime, setNewEndTime] = useState(displayEndTime.slice(0, 5));
  const [saving, setSaving] = useState(false);
  const [showPostponeConfirm, setShowPostponeConfirm] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [nextLessonDate, setNextLessonDate] = useState<Date | null>(null);
  const { toast } = useToast();

  const getDateLocale = () => {
    switch (language) {
      case 'en': return enUS;
      case 'es': return es;
      default: return tr;
    }
  };

  useEffect(() => {
    if (open) {
      const dateToUse = currentDate || originalDate;
      const startTimeToUse = currentStartTime || originalStartTime;
      const endTimeToUse = currentEndTime || originalEndTime;
      setNewDate(dateToUse);
      setNewStartTime(startTimeToUse.slice(0, 5));
      setNewEndTime(endTimeToUse.slice(0, 5));
      
      calculateNextLessonDate(originalDate).then(setNextLessonDate);
    }
  }, [open, originalDate, originalStartTime, originalEndTime, currentDate, currentStartTime, currentEndTime]);

  const formatTime = (time: string) => {
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString(language === 'tr' ? 'tr-TR' : language === 'es' ? 'es-ES' : 'en-US', {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return time;
    }
  };

  const hasDateTimeChanges = (): boolean => {
    if (!newDate) return false;
    
    const dateChanged = format(newDate, "yyyy-MM-dd") !== format(displayDate, "yyyy-MM-dd");
    const startTimeChanged = newStartTime !== displayStartTime.slice(0, 5);
    const endTimeChanged = newEndTime !== displayEndTime.slice(0, 5);
    
    return dateChanged || startTimeChanged || endTimeChanged;
  };

  const calculateNextLessonDate = async (currentDate: Date): Promise<Date | null> => {
    try {
      const { data: lessonDays, error } = await supabase
        .from("student_lessons")
        .select("day_of_week")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId);

      if (error || !lessonDays || lessonDays.length === 0) return null;

      const days = lessonDays.map((l: any) => l.day_of_week);
      let nextDate = addDays(currentDate, 1);
      
      let attempts = 0;
      while (!days.includes(nextDate.getDay()) && attempts < 14) {
        nextDate = addDays(nextDate, 1);
        attempts++;
      }
      
      return attempts >= 14 ? null : nextDate;
    } catch {
      return null;
    }
  };

  // Postpone: shift this and all subsequent planned instances forward using instanceGeneration
  const handlePostponeToNextLesson = async () => {
    setSaving(true);
    try {
      if (!instanceId) {
        toast({
          title: t("common.error"),
          description: t("dialogs.lessonOverride.noTrackingData"),
          variant: "destructive",
        });
        setSaving(false);
        setShowPostponeConfirm(false);
        return;
      }

      // Get template slots for shift calculation
      const { data: templateData } = await supabase
        .from("student_lessons")
        .select("day_of_week, start_time, end_time")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId);

      const templateSlots = (templateData || []).map((s: any) => ({
        dayOfWeek: s.day_of_week,
        startTime: s.start_time,
        endTime: s.end_time,
      }));

      // Use the instance-based shift function
      await shiftLessonsForward(studentId, teacherId, instanceId, templateSlots);

      toast({
        title: t("common.success"),
        description: t("dialogs.lessonOverride.postponeSuccess", { lesson: "" }),
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error postponing lesson:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.lessonOverride.postponeError"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setShowPostponeConfirm(false);
    }
  };

  // One-time date/time change: update the instance directly
  const handleOneTimeChange = async () => {
    if (!newDate) {
      toast({
        title: t("common.error"),
        description: t("dialogs.lessonOverride.selectDate"),
        variant: "destructive",
      });
      return;
    }

    if (!hasDateTimeChanges()) {
      toast({
        title: t("common.info"),
        description: t("dialogs.lessonOverride.noChanges"),
      });
      return;
    }

    if (!instanceId) {
      toast({
        title: t("common.error"),
        description: "Instance ID bulunamadı.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Check for conflicts at the new date/time
      const conflicts = await checkTeacherConflicts(
        teacherId,
        format(newDate, "yyyy-MM-dd"),
        newStartTime + ":00",
        newEndTime + ":00",
        instanceId,
        studentId
      );

      if (conflicts.length > 0) {
        const conflictDetails = conflicts
          .map((c) => `${c.studentName} (${c.timeRange})`)
          .join(", ");
        toast({
          title: t("dialogs.lessonOverride.conflictTitle", { defaultValue: "Çakışma Tespit Edildi" }),
          description: t("dialogs.lessonOverride.conflictDescription", {
            defaultValue: `Bu saatte başka dersler var: ${conflictDetails}`,
            details: conflictDetails,
          }),
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Get current instance data for original_date tracking
      const { data: currentInstance } = await supabase
        .from("lesson_instances")
        .select("lesson_date, start_time, end_time, original_date, original_start_time, original_end_time, rescheduled_count")
        .eq("id", instanceId)
        .single();

      const newDateStr = format(newDate, "yyyy-MM-dd");

      // Update instance directly with is_manual_override flag
      const { error } = await supabase
        .from("lesson_instances")
        .update({
          lesson_date: newDateStr,
          start_time: newStartTime + ":00",
          end_time: newEndTime + ":00",
          original_date: currentInstance?.original_date || currentInstance?.lesson_date,
          original_start_time: currentInstance?.original_start_time || currentInstance?.start_time,
          original_end_time: currentInstance?.original_end_time || currentInstance?.end_time,
          rescheduled_count: (currentInstance?.rescheduled_count || 0) + 1,
          is_manual_override: true,
        })
        .eq("id", instanceId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("dialogs.lessonOverride.moveSuccess", { date: format(newDate, "d MMMM", { locale: getDateLocale() }) }),
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving lesson change:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.lessonOverride.changeError"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Revert: restore instance to its original_date/time
  // If the instance has a shift_group_id, batch-revert all instances in that group
  const handleRevert = async () => {
    setSaving(true);
    try {
      if (!instanceId) {
        throw new Error("Instance ID bulunamadı.");
      }

      // Get current instance including shift_group_id
      const { data: inst, error: fetchError } = await supabase
        .from("lesson_instances")
        .select("original_date, original_start_time, original_end_time, shift_group_id")
        .eq("id", instanceId)
        .single();

      if (fetchError) throw fetchError;

      if (!inst?.original_date && !inst?.shift_group_id) {
        toast({
          title: t("common.info"),
          description: t("dialogs.lessonOverride.noChangesToRevert"),
        });
        setSaving(false);
        setShowRevertConfirm(false);
        return;
      }

      // If this instance belongs to a shift group, batch-revert all in the group
      if (inst?.shift_group_id) {
        const { data: groupInstances, error: groupError } = await supabase
          .from("lesson_instances")
          .select("id, original_date, original_start_time, original_end_time")
          .eq("shift_group_id", inst.shift_group_id)
          .not("original_date", "is", null);

        if (groupError) throw groupError;

        // Revert all instances in the shift group in parallel
        await Promise.all((groupInstances || []).map(gi =>
          supabase
            .from("lesson_instances")
            .update({
              lesson_date: gi.original_date,
              start_time: gi.original_start_time,
              end_time: gi.original_end_time,
              original_date: null,
              original_start_time: null,
              original_end_time: null,
              rescheduled_count: 0,
              shift_group_id: null,
              is_manual_override: false,
            })
            .eq("id", gi.id)
        ));

        toast({
          title: t("common.success"),
          description: t("dialogs.lessonOverride.revertSuccess"),
        });
      } else {
        // Single instance revert
        const { error } = await supabase
          .from("lesson_instances")
          .update({
            lesson_date: inst.original_date,
            start_time: inst.original_start_time || originalStartTime,
            end_time: inst.original_end_time || originalEndTime,
            original_date: null,
            original_start_time: null,
            original_end_time: null,
            rescheduled_count: 0,
            is_manual_override: false,
          })
          .eq("id", instanceId);

        if (error) throw error;

        toast({
          title: t("common.success"),
          description: t("dialogs.lessonOverride.revertSuccess"),
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error reverting lesson:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.lessonOverride.revertError"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setShowRevertConfirm(false);
    }
  };

  const handleSave = async () => {
    if (hasDateTimeChanges()) {
      await handleOneTimeChange();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{t("dialogs.lessonOverride.title")}</DialogTitle>
            <DialogDescription className="text-sm">
              {studentName} - {format(originalDate, "d MMM yyyy", { locale: getDateLocale() })} {formatTime(originalStartTime)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">{t("dialogs.lessonOverride.dateLabel")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {newDate ? format(newDate, "d MMM yyyy", { locale: getDateLocale() }) : t("dialogs.lessonOverride.selectDatePlaceholder")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={newDate}
                    onSelect={setNewDate}
                    locale={getDateLocale()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="text-sm">{t("dialogs.lessonOverride.startTimeLabel")}</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endTime" className="text-sm">{t("dialogs.lessonOverride.endTimeLabel")}</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPostponeConfirm(true)}
              disabled={saving}
              className="text-xs px-2"
            >
              <ArrowRight className="h-3.5 w-3.5 mr-1 shrink-0" />
              <span className="truncate">{t("dialogs.lessonOverride.postponeButton")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOneTimeChange}
              disabled={saving || !hasDateTimeChanges()}
              className={cn(
                "text-xs px-2",
                !hasDateTimeChanges() && "opacity-50"
              )}
            >
              <CalendarClock className="h-3.5 w-3.5 mr-1 shrink-0" />
              <span className="truncate">{t("dialogs.lessonOverride.oneTimeButton")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRevertConfirm(true)}
              disabled={saving || !hasExistingOverride}
              className={cn(
                "text-xs px-2",
                !hasExistingOverride && "opacity-50"
              )}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1 shrink-0" />
              <span className="truncate">{t("dialogs.lessonOverride.revertButton")}</span>
            </Button>
            <Button 
              size="sm"
              onClick={handleSave} 
              disabled={saving} 
              className="text-xs px-2"
            >
              <Save className="h-3.5 w-3.5 mr-1 shrink-0" />
              <span className="truncate">{saving ? t("common.saving") : t("common.save")}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Postpone Confirmation Dialog */}
      <AlertDialog open={showPostponeConfirm} onOpenChange={setShowPostponeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.lessonOverride.postponeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.lessonOverride.postponeDescription", { 
                name: studentName, 
                date: format(originalDate, "d MMMM yyyy", { locale: getDateLocale() }) 
              })}
              <br /><br />
              <strong>{t("dialogs.lessonOverride.postponeEffects")}</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>{t("dialogs.lessonOverride.postponeEffect1", { date: nextLessonDate ? format(nextLessonDate, "d MMMM", { locale: getDateLocale() }) : t("dialogs.lessonOverride.nextLessonDay") })}</li>
                <li>{t("dialogs.lessonOverride.postponeEffect2")}</li>
                <li>{t("dialogs.lessonOverride.postponeEffect3")}</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handlePostponeToNextLesson}>
              {t("dialogs.lessonOverride.transfer")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revert Confirmation Dialog */}
      <AlertDialog open={showRevertConfirm} onOpenChange={setShowRevertConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.lessonOverride.revertTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.lessonOverride.revertDescription", { 
                name: studentName, 
                date: format(originalDate, "d MMMM yyyy", { locale: getDateLocale() }),
                time: formatTime(originalStartTime)
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert}>
              {t("dialogs.lessonOverride.revert")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
