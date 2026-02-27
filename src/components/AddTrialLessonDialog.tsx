import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { checkTeacherConflicts } from "@/lib/conflictDetection";

interface AddTrialLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  onSuccess: () => void;
}

export function AddTrialLessonDialog({ open, onOpenChange, teacherId, onSuccess }: AddTrialLessonDialogProps) {
  const { t } = useTranslation();
  const [dayOfWeek, setDayOfWeek] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const days = [
    { value: "1", label: t("days.monday") },
    { value: "2", label: t("days.tuesday") },
    { value: "3", label: t("days.wednesday") },
    { value: "4", label: t("days.thursday") },
    { value: "5", label: t("days.friday") },
    { value: "6", label: t("days.saturday") },
    { value: "0", label: t("days.sunday") },
  ];

  const getNextDayOfWeek = (targetDay: number): string => {
    const today = new Date();
    const currentDay = today.getDay();
    let daysUntilTarget = targetDay - currentDay;
    if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    }
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    return targetDate.toISOString().split("T")[0];
  };

  const handleSubmit = async () => {
    if (!dayOfWeek || !startTime || !endTime) {
      toast({
        title: t("addTrialLesson.missingFields"),
        description: t("addTrialLesson.fillAllFields"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const lessonDate = getNextDayOfWeek(parseInt(dayOfWeek));

      // Check for conflicts before saving
      const conflicts = await checkTeacherConflicts(
        teacherId,
        lessonDate,
        startTime + ":00",
        endTime + ":00"
      );

      if (conflicts.length > 0) {
        const conflictDetails = conflicts
          .map((c) => `${c.studentName} (${c.timeRange})`)
          .join(", ");
        toast({
          title: t("addTrialLesson.conflict", { defaultValue: "Çakışma Tespit Edildi" }),
          description: t("addTrialLesson.conflictDescription", {
            defaultValue: `Bu saatte başka dersler var: ${conflictDetails}`,
            details: conflictDetails,
          }),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("trial_lessons").insert({
        teacher_id: teacherId,
        day_of_week: parseInt(dayOfWeek),
        start_time: startTime,
        end_time: endTime,
        lesson_date: lessonDate,
      });

      if (error) throw error;

      toast({
        title: t("addTrialLesson.success"),
        description: t("addTrialLesson.lessonAdded"),
      });

      setDayOfWeek("");
      setStartTime("");
      setEndTime("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: t("addTrialLesson.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addTrialLesson.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("addTrialLesson.day")}</Label>
            <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
              <SelectTrigger>
                <SelectValue placeholder={t("addTrialLesson.dayPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("addTrialLesson.startTime")}</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{t("addTrialLesson.endTime")}</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("addTrialLesson.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? t("addTrialLesson.adding") : t("addTrialLesson.confirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
