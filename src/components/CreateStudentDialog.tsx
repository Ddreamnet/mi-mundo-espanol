import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";

interface StudentLesson {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface CreateStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentCreated: () => void;
  teacherId: string;
}

export function CreateStudentDialog({ open, onOpenChange, onStudentCreated, teacherId }: CreateStudentDialogProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [lessonsPerWeek, setLessonsPerWeek] = useState(1);
  const [lessons, setLessons] = useState<StudentLesson[]>([{ dayOfWeek: 1, startTime: "", endTime: "" }]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { daysOfWeek } = useLanguage();

  useEffect(() => {
    if (lessonsPerWeek > lessons.length) {
      const newLessons = [...lessons];
      for (let i = lessons.length; i < lessonsPerWeek; i++) {
        newLessons.push({ dayOfWeek: 1, startTime: "", endTime: "" });
      }
      setLessons(newLessons);
    } else if (lessonsPerWeek < lessons.length) {
      setLessons(lessons.slice(0, lessonsPerWeek));
    }
  }, [lessonsPerWeek]);

  const updateLesson = (index: number, field: keyof StudentLesson, value: string | number) => {
    const updatedLessons = [...lessons];
    updatedLessons[index] = { ...updatedLessons[index], [field]: value };
    setLessons(updatedLessons);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !name || !tempPassword) {
      toast({
        title: t("common.error"),
        description: t("dialogs.createStudent.fillAllFields"),
        variant: "destructive",
      });
      return;
    }

    if (tempPassword.length < 6) {
      toast({
        title: t("common.error"),
        description: t("dialogs.createStudent.passwordMinLength"),
        variant: "destructive",
      });
      return;
    }

    if (!lessons.every((lesson) => lesson.dayOfWeek !== undefined && lesson.startTime && lesson.endTime)) {
      toast({
        title: t("common.error"),
        description: t("dialogs.createStudent.fillSchedule"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-student", {
        body: {
          email,
          name,
          password: tempPassword,
          teacherId,
          lessons: lessons.map((lesson) => ({
            day_of_week: lesson.dayOfWeek,
            start_time: lesson.startTime,
            end_time: lesson.endTime,
          })),
        },
      });

      if (error) {
        // Non-2xx responses only carry a generic message; the real reason is in the response body
        const body = await error.context?.json?.().catch(() => null);
        throw new Error(body?.error || error.message);
      }

      const result = data as any;
      if (result?.error) {
        toast({
          title: t("common.error"),
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("common.success"),
        description: t("dialogs.createStudent.successMessage", { password: tempPassword }),
      });

      setEmail("");
      setName("");
      setTempPassword("");
      setLessonsPerWeek(1);
      setLessons([{ dayOfWeek: 1, startTime: "", endTime: "" }]);
      onStudentCreated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.createStudent.createError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(result);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t("dialogs.createStudent.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("dialogs.createStudent.emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("dialogs.createStudent.emailPlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{t("common.nameSurname")}</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("dialogs.createStudent.namePlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("dialogs.createStudent.tempPasswordLabel")}</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="text"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder={t("dialogs.createStudent.passwordPlaceholder")}
                required
              />
              <Button type="button" variant="outline" onClick={generatePassword} className="shrink-0">
                {t("dialogs.createStudent.generateBtn")}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lessonsPerWeek">{t("dialogs.createStudent.lessonsPerWeekLabel")}</Label>
            <Select
              value={lessonsPerWeek.toString()}
              onValueChange={(value) => setLessonsPerWeek(Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {t("dialogs.createStudent.lessonsUnit")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">{t("dialogs.createStudent.scheduleLabel")}</Label>
            {lessons.map((lesson, index) => (
              <div key={index} className="grid grid-cols-3 gap-3 p-3 border rounded-lg">
                <div className="space-y-2">
                  <Label>{t("dialogs.createStudent.dayLabel")}</Label>
                  <Select
                    value={lesson.dayOfWeek.toString()}
                    onValueChange={(value) => updateLesson(index, "dayOfWeek", Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("dialogs.createStudent.startTimeLabel")}</Label>
                  <Input
                    type="time"
                    value={lesson.startTime}
                    onChange={(e) => updateLesson(index, "startTime", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("dialogs.createStudent.endTimeLabel")}</Label>
                  <Input
                    type="time"
                    value={lesson.endTime}
                    onChange={(e) => updateLesson(index, "endTime", e.target.value)}
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm opacity-70">
              <strong>{t("dialogs.createStudent.noteLabel")}:</strong> {t("dialogs.createStudent.noteText")}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="transition-all duration-150 hover:scale-105 active:scale-95"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("dialogs.createStudent.createBtn")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
