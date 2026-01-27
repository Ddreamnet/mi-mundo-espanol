import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

interface LessonOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  teacherId: string;
  studentName: string;
  originalDate: Date;
  originalDayOfWeek: number;
  originalStartTime: string;
  originalEndTime: string;
  // Current display date/time (might be different from original if already overridden)
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
  
  // Use current values if provided, otherwise fall back to original
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

  // Reset state when dialog opens with new lesson data
  useEffect(() => {
    if (open) {
      const dateToUse = currentDate || originalDate;
      const startTimeToUse = currentStartTime || originalStartTime;
      const endTimeToUse = currentEndTime || originalEndTime;
      setNewDate(dateToUse);
      setNewStartTime(startTimeToUse.slice(0, 5));
      setNewEndTime(endTimeToUse.slice(0, 5));
      
      // Calculate next lesson date for "Sonraki Derse Aktar" button
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

  // Check if date/time has been changed from the display values
  const hasDateTimeChanges = (): boolean => {
    if (!newDate) return false;
    
    const dateChanged = format(newDate, "yyyy-MM-dd") !== format(displayDate, "yyyy-MM-dd");
    const startTimeChanged = newStartTime !== displayStartTime.slice(0, 5);
    const endTimeChanged = newEndTime !== displayEndTime.slice(0, 5);
    
    return dateChanged || startTimeChanged || endTimeChanged;
  };

  // Calculate next lesson date based on student's lesson days
  const calculateNextLessonDate = async (currentDate: Date): Promise<Date | null> => {
    try {
      // Get student's lesson days
      const { data: lessonDays, error } = await supabase
        .from("student_lessons")
        .select("day_of_week")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId);

      if (error || !lessonDays || lessonDays.length === 0) {
        console.error("Could not fetch lesson days:", error);
        return null;
      }

      const days = lessonDays.map((l: any) => l.day_of_week);
      
      // Find the next lesson day after current date
      let nextDate = new Date(currentDate);
      nextDate.setHours(0, 0, 0, 0);
      
      // Start from next day
      nextDate = addDays(nextDate, 1);
      
      // Find the next day that matches a lesson day
      let attempts = 0;
      while (!days.includes(nextDate.getDay()) && attempts < 14) {
        nextDate = addDays(nextDate, 1);
        attempts++;
      }
      
      if (attempts >= 14) {
        console.error("Could not find next lesson day");
        return null;
      }
      
      return nextDate;
    } catch (error) {
      console.error("Error calculating next lesson date:", error);
      return null;
    }
  };

  // Handler for "Sonraki Derse Aktar" - shifts all subsequent lesson dates
  const handlePostponeToNextLesson = async () => {
    setSaving(true);
    try {
      // Get current lesson tracking data
      const { data: trackingData, error: trackingError } = await supabase
        .from("student_lesson_tracking")
        .select("*")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (trackingError) throw trackingError;

      if (!trackingData || !trackingData.lesson_dates) {
        toast({
          title: t("common.error"),
          description: t("dialogs.lessonOverride.noTrackingData"),
          variant: "destructive",
        });
        setSaving(false);
        setShowPostponeConfirm(false);
        return;
      }

      const lessonDates = trackingData.lesson_dates as Record<string, string>;
      const originalDateStr = format(originalDate, "yyyy-MM-dd");
      
      // Find which lesson number corresponds to this date
      let targetLessonNumber: number | null = null;
      for (const [lessonNum, dateStr] of Object.entries(lessonDates)) {
        if (dateStr === originalDateStr) {
          targetLessonNumber = parseInt(lessonNum);
          break;
        }
      }

      if (targetLessonNumber === null) {
        toast({
          title: t("common.error"),
          description: t("dialogs.lessonOverride.lessonNotFound"),
          variant: "destructive",
        });
        setSaving(false);
        setShowPostponeConfirm(false);
        return;
      }

      // Get student's lesson days for calculating new dates
      const { data: lessonDays, error: lessonDaysError } = await supabase
        .from("student_lessons")
        .select("day_of_week")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId);

      if (lessonDaysError || !lessonDays || lessonDays.length === 0) {
        toast({
          title: t("common.error"),
          description: t("dialogs.lessonOverride.lessonDaysNotFound"),
          variant: "destructive",
        });
        setSaving(false);
        setShowPostponeConfirm(false);
        return;
      }

      const days = lessonDays.map((l: any) => l.day_of_week).sort((a: number, b: number) => a - b);
      
      // Shift all lessons from targetLessonNumber onwards
      const totalLessons = trackingData.lessons_per_week * 4;
      const newLessonDates: Record<string, string> = { ...lessonDates };
      
      // Start from the original date and find the next lesson date
      let currentLessonDate = new Date(originalDate);
      
      for (let i = targetLessonNumber; i <= totalLessons; i++) {
        // Find next lesson date
        let nextDate = addDays(currentLessonDate, 1);
        let attempts = 0;
        while (!days.includes(nextDate.getDay()) && attempts < 14) {
          nextDate = addDays(nextDate, 1);
          attempts++;
        }
        
        newLessonDates[i.toString()] = format(nextDate, "yyyy-MM-dd");
        currentLessonDate = nextDate;
      }

      // Update the lesson_dates in database
      const { error: updateError } = await supabase
        .from("student_lesson_tracking")
        .update({ lesson_dates: newLessonDates })
        .eq("id", trackingData.id);

      if (updateError) throw updateError;

      // Also delete any existing override for this original date
      await supabase
        .from("lesson_overrides")
        .delete()
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId)
        .eq("original_date", originalDateStr);

      toast({
        title: t("common.success"),
        description: t("dialogs.lessonOverride.postponeSuccess", { lesson: targetLessonNumber }),
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

  // Handler for "Tarihi Değiştir (1 Seferlik)" - creates/updates lesson_override
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

    setSaving(true);
    try {
      // Check if there's an existing override for this date
      const { data: existingOverride } = await supabase
        .from("lesson_overrides")
        .select("id")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId)
        .eq("original_date", format(originalDate, "yyyy-MM-dd"))
        .maybeSingle();

      if (existingOverride) {
        // Update existing override
        const { error } = await supabase
          .from("lesson_overrides")
          .update({
            new_date: format(newDate, "yyyy-MM-dd"),
            new_start_time: newStartTime + ":00",
            new_end_time: newEndTime + ":00",
            is_cancelled: false,
          })
          .eq("id", existingOverride.id);

        if (error) throw error;
      } else {
        // Create new override
        const { error } = await supabase.from("lesson_overrides").insert({
          student_id: studentId,
          teacher_id: teacherId,
          original_date: format(originalDate, "yyyy-MM-dd"),
          original_day_of_week: originalDayOfWeek,
          original_start_time: originalStartTime,
          original_end_time: originalEndTime,
          new_date: format(newDate, "yyyy-MM-dd"),
          new_start_time: newStartTime + ":00",
          new_end_time: newEndTime + ":00",
          is_cancelled: false,
        });

        if (error) throw error;
      }

      toast({
        title: t("common.success"),
        description: t("dialogs.lessonOverride.moveSuccess", { date: format(newDate, "d MMMM", { locale: getDateLocale() }) }),
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving lesson override:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.lessonOverride.changeError"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handler for "Değişiklikleri Geri Al"
  const handleRevert = async () => {
    setSaving(true);
    try {
      // Delete the existing override record
      const { error } = await supabase
        .from("lesson_overrides")
        .delete()
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId)
        .eq("original_date", format(originalDate, "yyyy-MM-dd"));

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("dialogs.lessonOverride.revertSuccess"),
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error reverting lesson override:", error);
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

  // Handler for "Kaydet" - just saves date/time changes
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
