import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

  // Calculate the next occurrence of a specific day of week
  const getNextDayOfWeek = (targetDay: number): string => {
    const today = new Date();
    const currentDay = today.getDay(); // 0=Sunday, 1=Monday, etc.
    
    // Calculate days until target day
    let daysUntilTarget = targetDay - currentDay;
    
    // If target day is today or already passed this week, use this week's day
    // (if today, use today; if passed, still use this week for immediate display)
    if (daysUntilTarget < 0) {
      daysUntilTarget += 7; // Move to next week
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
      // Calculate the actual lesson date based on day_of_week
      const lessonDate = getNextDayOfWeek(parseInt(dayOfWeek));
      
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