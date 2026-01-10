import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
import { Loader2, Trash2, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, parse } from "date-fns";
import { useTranslation } from "react-i18next";

interface StudentLesson {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  note?: string;
}

interface LessonDates {
  [key: string]: string;
}

interface LessonOverride {
  id: string;
  original_date: string;
  new_date: string | null;
  is_cancelled: boolean;
}

interface EditStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentUpdated: () => void;
  studentId: string;
  currentName: string;
  currentLessons: StudentLesson[];
}

export function EditStudentDialog({
  open,
  onOpenChange,
  onStudentUpdated,
  studentId,
  currentName,
  currentLessons,
}: EditStudentDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [lessonsPerWeek, setLessonsPerWeek] = useState(1);
  const [lessons, setLessons] = useState<StudentLesson[]>([{ dayOfWeek: 1, startTime: "", endTime: "", note: "" }]);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [lessonDates, setLessonDates] = useState<LessonDates>({});
  const [originalLessonDates, setOriginalLessonDates] = useState<LessonDates>({});
  const [lessonOverrides, setLessonOverrides] = useState<LessonOverride[]>([]);
  const [trackingRecordId, setTrackingRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [updateRemainingDays, setUpdateRemainingDays] = useState(false);
  const { toast } = useToast();

  const daysOfWeek = [
    { value: 1, label: t("days.monday") },
    { value: 2, label: t("days.tuesday") },
    { value: 3, label: t("days.wednesday") },
    { value: 4, label: t("days.thursday") },
    { value: 5, label: t("days.friday") },
    { value: 6, label: t("days.saturday") },
    { value: 0, label: t("days.sunday") },
  ];

  useEffect(() => {
    if (open) {
      setName(currentName);
      setLessonsPerWeek(currentLessons.length || 1);
      setLessons(
        currentLessons.length > 0
          ? currentLessons
          : [{ dayOfWeek: 1, startTime: "", endTime: "", note: "" }]
      );
      fetchLessonTracking();
      fetchLessonOverrides();
    }
  }, [open, currentName, currentLessons]);

  const fetchLessonTracking = async () => {
    try {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("student_id, teacher_id")
        .eq("id", studentId)
        .single();

      if (studentError) throw studentError;

      // CRITICAL: Get the MOST RECENT tracking record by ordering by updated_at DESC
      const { data: records, error } = await supabase
        .from("student_lesson_tracking")
        .select("*")
        .eq("student_id", studentData.student_id)
        .eq("teacher_id", studentData.teacher_id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (records && records.length > 0) {
        const data = records[0];
        setTrackingRecordId(data.id);
        setCompletedLessons((data as any).completed_lessons || []);
        const dates = (data as any).lesson_dates || {};
        setLessonDates(dates);
        setOriginalLessonDates(dates);
      } else {
        setTrackingRecordId(null);
      }
    } catch (error: any) {
      console.error("Failed to fetch lesson tracking:", error);
    }
  };

  const fetchLessonOverrides = async () => {
    try {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("student_id, teacher_id")
        .eq("id", studentId)
        .single();

      if (studentError) throw studentError;

      const { data, error } = await supabase
        .from("lesson_overrides")
        .select("id, original_date, new_date, is_cancelled")
        .eq("student_id", studentData.student_id)
        .eq("teacher_id", studentData.teacher_id);

      if (error) throw error;
      setLessonOverrides(data || []);
    } catch (error: any) {
      console.error("Failed to fetch lesson overrides:", error);
    }
  };

  useEffect(() => {
    if (lessonsPerWeek > lessons.length) {
      const newLessons = [...lessons];
      for (let i = lessons.length; i < lessonsPerWeek; i++) {
        newLessons.push({ dayOfWeek: 1, startTime: "", endTime: "", note: "" });
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

  const updateLessonDate = (lessonNumber: number, dateStr: string) => {
    setLessonDates({
      ...lessonDates,
      [lessonNumber.toString()]: dateStr,
    });
  };

  const recalculateRemainingDates = (fromLessonNumber: number, startDate: string): LessonDates => {
    const newDates = { ...lessonDates };
    const lessonDays = lessons.map((l) => l.dayOfWeek).sort((a, b) => a - b);
    const totalLessons = lessonsPerWeek * 4;
    
    // Set the changed lesson's date
    newDates[fromLessonNumber.toString()] = startDate;
    
    // Recalculate PREVIOUS lessons (going backwards)
    let currentDate = parse(startDate, "yyyy-MM-dd", new Date());
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = fromLessonNumber - 1; i >= 1; i--) {
      let daysToSubtract = 1;
      let prevDate = addDays(currentDate, -daysToSubtract);
      
      while (!lessonDays.includes(prevDate.getDay())) {
        daysToSubtract++;
        prevDate = addDays(currentDate, -daysToSubtract);
      }
      
      currentDate = prevDate;
      newDates[i.toString()] = format(currentDate, "yyyy-MM-dd");
    }
    
    // Recalculate FUTURE lessons (going forwards)
    currentDate = parse(startDate, "yyyy-MM-dd", new Date());
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = fromLessonNumber + 1; i <= totalLessons; i++) {
      let daysToAdd = 1;
      let nextDate = addDays(currentDate, daysToAdd);
      
      while (!lessonDays.includes(nextDate.getDay())) {
        daysToAdd++;
        nextDate = addDays(currentDate, daysToAdd);
      }
      
      currentDate = nextDate;
      newDates[i.toString()] = format(currentDate, "yyyy-MM-dd");
    }
    
    return newDates;
  };

  const handleDateSubmit = () => {
    const hasChanges = Object.keys(lessonDates).some(
      (key) => lessonDates[key] !== originalLessonDates[key]
    );

    if (hasChanges) {
      setShowConfirm(true);
    } else {
      toast({
        title: t("common.info"),
        description: t("dialogs.editStudent.noChanges"),
      });
    }
  };

  const handleMarkLastLesson = async () => {
    try {
      const totalLessons = lessonsPerWeek * 4;
      if (completedLessons.length >= totalLessons) return;

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("student_id, teacher_id")
        .eq("id", studentId)
        .single();

      if (studentError) throw studentError;

      const nextLesson = completedLessons.length === 0 ? 1 : Math.max(...completedLessons) + 1;
      const newCompletedLessons = [...completedLessons, nextLesson].sort((a, b) => a - b);

      const { data: existingRecords } = await supabase
        .from("student_lesson_tracking")
        .select("id")
        .eq("student_id", studentData.student_id)
        .eq("teacher_id", studentData.teacher_id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (!existingRecords || existingRecords.length === 0) {
        throw new Error(t("dialogs.editStudent.trackingNotFound"));
      }

      const { error } = await supabase
        .from("student_lesson_tracking")
        .update({ completed_lessons: newCompletedLessons })
        .eq("id", existingRecords[0].id);

      if (error) throw error;

      await updateTeacherBalance(studentData.teacher_id, studentData.student_id);

      setCompletedLessons(newCompletedLessons);
      toast({
        title: t("common.success"),
        description: t("dialogs.editStudent.lessonMarked", { lesson: nextLesson }),
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.editStudent.markError"),
        variant: "destructive",
      });
    }
  };

  const handleUndoLastLesson = async () => {
    try {
      if (completedLessons.length === 0) return;

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("student_id, teacher_id")
        .eq("id", studentId)
        .single();

      if (studentError) throw studentError;

      const lastLesson = Math.max(...completedLessons);
      const newCompletedLessons = completedLessons.filter(l => l !== lastLesson);

      const { data: existingRecords } = await supabase
        .from("student_lesson_tracking")
        .select("id")
        .eq("student_id", studentData.student_id)
        .eq("teacher_id", studentData.teacher_id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (!existingRecords || existingRecords.length === 0) {
        throw new Error(t("dialogs.editStudent.trackingNotFound"));
      }

      const { error } = await supabase
        .from("student_lesson_tracking")
        .update({ completed_lessons: newCompletedLessons })
        .eq("id", existingRecords[0].id);

      if (error) throw error;

      await subtractFromTeacherBalance(studentData.teacher_id, studentData.student_id);

      setCompletedLessons(newCompletedLessons);
      toast({
        title: t("common.success"),
        description: t("dialogs.editStudent.lessonUndone", { lesson: lastLesson }),
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.editStudent.undoError"),
        variant: "destructive",
      });
    }
  };

  const updateTeacherBalance = async (teacherId: string, studentId: string) => {
    try {
      const { data: lessonData } = await supabase
        .from("student_lessons")
        .select("start_time, end_time")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId)
        .limit(1)
        .single();

      if (!lessonData) return;

      const startTime = new Date(`2000-01-01T${lessonData.start_time}`);
      const endTime = new Date(`2000-01-01T${lessonData.end_time}`);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      const { data: existingBalance } = await supabase
        .from("teacher_balance")
        .select("*")
        .eq("teacher_id", teacherId)
        .maybeSingle();

      if (existingBalance) {
        await supabase
          .from("teacher_balance")
          .update({
            total_minutes: existingBalance.total_minutes + durationMinutes,
            completed_regular_lessons: existingBalance.completed_regular_lessons + 1,
            regular_lessons_minutes: existingBalance.regular_lessons_minutes + durationMinutes,
          })
          .eq("teacher_id", teacherId);
      } else {
        await supabase.from("teacher_balance").insert({
          teacher_id: teacherId,
          total_minutes: durationMinutes,
          completed_regular_lessons: 1,
          completed_trial_lessons: 0,
          regular_lessons_minutes: durationMinutes,
          trial_lessons_minutes: 0,
        });
      }
    } catch (error) {
      console.error("Error updating teacher balance:", error);
    }
  };

  const subtractFromTeacherBalance = async (teacherId: string, studentId: string) => {
    try {
      const { data: lessonData } = await supabase
        .from("student_lessons")
        .select("start_time, end_time")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId)
        .limit(1)
        .single();

      if (!lessonData) return;

      const startTime = new Date(`2000-01-01T${lessonData.start_time}`);
      const endTime = new Date(`2000-01-01T${lessonData.end_time}`);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      const { data: existingBalance } = await supabase
        .from("teacher_balance")
        .select("*")
        .eq("teacher_id", teacherId)
        .maybeSingle();

      if (existingBalance) {
        await supabase
          .from("teacher_balance")
          .update({
            total_minutes: Math.max(0, existingBalance.total_minutes - durationMinutes),
            completed_regular_lessons: Math.max(0, existingBalance.completed_regular_lessons - 1),
            regular_lessons_minutes: Math.max(0, existingBalance.regular_lessons_minutes - durationMinutes),
          })
          .eq("teacher_id", teacherId);
      }
    } catch (error) {
      console.error("Error subtracting from teacher balance:", error);
    }
  };

  const handleResetAllLessons = async () => {
    try {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("student_id, teacher_id")
        .eq("id", studentId)
        .single();

      if (studentError) throw studentError;

      const { data: existingRecords } = await supabase
        .from("student_lesson_tracking")
        .select("id")
        .eq("student_id", studentData.student_id)
        .eq("teacher_id", studentData.teacher_id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (!existingRecords || existingRecords.length === 0) {
        throw new Error(t("dialogs.editStudent.trackingNotFound"));
      }

      const { error } = await supabase
        .from("student_lesson_tracking")
        .update({ 
          completed_lessons: [],
          lesson_dates: {}
        })
        .eq("id", existingRecords[0].id);

      if (error) throw error;

      setCompletedLessons([]);
      setLessonDates({});
      setOriginalLessonDates({});
      setShowResetConfirm(false);
      
      toast({
        title: t("common.success"),
        description: t("dialogs.editStudent.resetSuccess"),
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.editStudent.resetError"),
        variant: "destructive",
      });
    }
  };

  const confirmDateUpdate = async () => {
    try {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("student_id, teacher_id")
        .eq("id", studentId)
        .single();

      if (studentError) throw studentError;

      let finalDates = lessonDates;

      if (updateRemainingDays) {
        const changedKeys = Object.keys(lessonDates).filter(
          (key) => lessonDates[key] !== originalLessonDates[key]
        );

        if (changedKeys.length > 0) {
          const firstChangedLesson = Math.min(...changedKeys.map(Number));
          finalDates = recalculateRemainingDates(firstChangedLesson, lessonDates[firstChangedLesson.toString()]);
        }
      }

      const { data: existingRecords } = await supabase
        .from("student_lesson_tracking")
        .select("id")
        .eq("student_id", studentData.student_id)
        .eq("teacher_id", studentData.teacher_id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (!existingRecords || existingRecords.length === 0) {
        throw new Error(t("dialogs.editStudent.trackingNotFound"));
      }

      const { error } = await supabase
        .from("student_lesson_tracking")
        .update({ lesson_dates: finalDates })
        .eq("id", existingRecords[0].id);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("dialogs.editStudent.datesUpdated"),
      });

      setOriginalLessonDates(finalDates);
      setLessonDates(finalDates);
      setShowConfirm(false);
      setUpdateRemainingDays(false);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.editStudent.datesUpdateError"),
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: t("common.error"),
        description: t("dialogs.editStudent.nameRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!lessons.every((lesson) => lesson.dayOfWeek !== undefined && lesson.startTime && lesson.endTime)) {
      toast({
        title: t("common.error"),
        description: t("dialogs.editStudent.scheduleRequired"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("student_id, teacher_id")
        .eq("id", studentId)
        .single();

      if (studentError) throw studentError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: name.trim() })
        .eq("user_id", studentData.student_id);

      if (profileError) throw profileError;

      const { error: deleteError } = await supabase
        .from("student_lessons")
        .delete()
        .eq("student_id", studentData.student_id)
        .eq("teacher_id", studentData.teacher_id);

      if (deleteError) throw deleteError;

      const lessonsToInsert = lessons.map((lesson) => ({
        student_id: studentData.student_id,
        teacher_id: studentData.teacher_id,
        day_of_week: lesson.dayOfWeek,
        start_time: lesson.startTime,
        end_time: lesson.endTime,
        note: lesson.note || null,
      }));

      const { error: insertError } = await supabase.from("student_lessons").insert(lessonsToInsert);

      if (insertError) throw insertError;

      toast({
        title: t("common.success"),
        description: t("dialogs.editStudent.updateSuccess"),
      });

      onStudentUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.editStudent.updateError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    setLoading(true);
    try {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("student_id, teacher_id")
        .eq("id", studentId)
        .single();

      if (studentError) throw studentError;

      // Delete all related data
      const { data: topics } = await supabase
        .from("topics")
        .select("id")
        .eq("student_id", studentData.student_id)
        .eq("teacher_id", studentData.teacher_id);

      if (topics && topics.length > 0) {
        const topicIds = topics.map((t) => t.id);
        await supabase.from("resources").delete().in("topic_id", topicIds);
        await supabase.from("topics").delete().in("id", topicIds);
      }

      await supabase
        .from("student_resource_completion")
        .delete()
        .eq("student_id", studentData.student_id);

      await supabase
        .from("student_lesson_tracking")
        .delete()
        .eq("student_id", studentData.student_id)
        .eq("teacher_id", studentData.teacher_id);

      await supabase
        .from("student_lessons")
        .delete()
        .eq("student_id", studentData.student_id)
        .eq("teacher_id", studentData.teacher_id);

      await supabase
        .from("homework_submissions")
        .delete()
        .eq("student_id", studentData.student_id)
        .eq("teacher_id", studentData.teacher_id);

      await supabase.from("students").delete().eq("id", studentId);

      await supabase.from("profiles").delete().eq("user_id", studentData.student_id);

      toast({
        title: t("common.success"),
        description: t("dialogs.editStudent.deleteSuccess"),
      });

      onStudentUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.editStudent.deleteError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("dialogs.editStudent.title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("dialogs.editStudent.nameLabel")}</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("dialogs.editStudent.namePlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lessonsPerWeek">{t("dialogs.editStudent.lessonsPerWeekLabel")}</Label>
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
                    {num} {t("dialogs.editStudent.lessonsUnit")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">{t("dialogs.editStudent.scheduleLabel")}</Label>
            {lessons.map((lesson, index) => (
              <div key={index} className="grid grid-cols-4 gap-3 p-3 border rounded-lg">
                <div className="space-y-2">
                  <Label>{t("dialogs.editStudent.dayLabel")}</Label>
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
                  <Label>{t("dialogs.editStudent.startTimeLabel")}</Label>
                  <Input
                    type="time"
                    value={lesson.startTime}
                    onChange={(e) => updateLesson(index, "startTime", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("dialogs.editStudent.endTimeLabel")}</Label>
                  <Input
                    type="time"
                    value={lesson.endTime}
                    onChange={(e) => updateLesson(index, "endTime", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("dialogs.editStudent.noteLabel")}</Label>
                  <Input
                    type="text"
                    value={lesson.note || ""}
                    onChange={(e) => updateLesson(index, "note", e.target.value)}
                    placeholder={t("dialogs.editStudent.notePlaceholder")}
                  />
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* İşlenen Dersler Bölümü */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">{t("dialogs.editStudent.completedLessonsTitle")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("dialogs.editStudent.completedLessonsDescription")}
                </p>
              </div>
              <div className="flex gap-2">
                {completedLessons.length < lessonsPerWeek * 4 && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleMarkLastLesson}
                    disabled={loading}
                  >
                    {t("dialogs.editStudent.markLastLesson")}
                  </Button>
                )}
                {completedLessons.length > 0 && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUndoLastLesson}
                      disabled={loading}
                    >
                      {t("dialogs.editStudent.undoLastLesson")}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowResetConfirm(true)}
                      disabled={loading}
                    >
                      {t("dialogs.editStudent.reset")}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {(() => {
                const totalLessons = lessonsPerWeek * 4;
                
                const lessonsWithDates: { lessonNumber: number; originalDate: string; effectiveDate: string; isCancelled: boolean; isOverridden: boolean }[] = [];
                
                for (let i = 1; i <= totalLessons; i++) {
                  const originalDate = lessonDates[i.toString()];
                  if (!originalDate) {
                    lessonsWithDates.push({
                      lessonNumber: i,
                      originalDate: "",
                      effectiveDate: "",
                      isCancelled: false,
                      isOverridden: false,
                    });
                    continue;
                  }
                  
                  const override = lessonOverrides.find((o) => o.original_date === originalDate);
                  const isCancelled = override?.is_cancelled || false;
                  const effectiveDate = override && override.new_date && !isCancelled 
                    ? override.new_date 
                    : originalDate;
                  
                  lessonsWithDates.push({
                    lessonNumber: i,
                    originalDate,
                    effectiveDate,
                    isCancelled,
                    isOverridden: effectiveDate !== originalDate,
                  });
                }
                
                const sortedLessons = [...lessonsWithDates].filter(l => l.originalDate).sort((a, b) => {
                  if (a.isCancelled && b.isCancelled) return a.originalDate.localeCompare(b.originalDate);
                  if (a.isCancelled) return a.originalDate.localeCompare(b.effectiveDate);
                  if (b.isCancelled) return a.effectiveDate.localeCompare(b.originalDate);
                  return a.effectiveDate.localeCompare(b.effectiveDate);
                });
                
                const lessonsWithoutDates = lessonsWithDates.filter(l => !l.originalDate);
                const allLessons = [...sortedLessons, ...lessonsWithoutDates];
                
                return allLessons.map((lesson, displayIndex) => (
                  <div key={lesson.lessonNumber} className={`flex items-center gap-3 p-3 border rounded-lg ${
                    lesson.isCancelled ? "opacity-50 bg-muted" : ""
                  } ${lesson.isOverridden ? "border-warning" : ""}`}>
                    <div className="flex items-center gap-2 flex-1">
                      <div 
                        className={`h-4 w-4 rounded-full ${
                          lesson.isCancelled 
                            ? "bg-muted-foreground" 
                            : completedLessons.includes(lesson.lessonNumber) 
                              ? "bg-primary" 
                              : "bg-muted"
                        }`} 
                      />
                      <span className={`font-medium ${
                        lesson.isCancelled 
                          ? "text-muted-foreground line-through" 
                          : completedLessons.includes(lesson.lessonNumber) 
                            ? "text-primary-foreground" 
                            : "text-foreground/80"
                      }`}>
                        {t("dialogs.editStudent.lesson")} {displayIndex + 1}
                        {lesson.isCancelled && ` (${t("dialogs.editStudent.cancelled")})`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className={`text-sm ${lesson.isOverridden ? "text-warning font-medium" : "text-muted-foreground"}`}>
                        {lesson.isOverridden ? t("dialogs.editStudent.newDate") : t("dialogs.editStudent.dateLabel")}
                      </Label>
                      <Input
                        type="date"
                        value={lesson.effectiveDate || lessonDates[lesson.lessonNumber.toString()] || ""}
                        onChange={(e) => updateLessonDate(lesson.lessonNumber, e.target.value)}
                        className={`w-40 ${lesson.isOverridden ? "border-warning" : ""}`}
                        disabled={lesson.isCancelled}
                      />
                    </div>
                  </div>
                ));
              })()}
              <Button
                type="button"
                variant="default"
                onClick={handleDateSubmit}
                disabled={loading || Object.keys(lessonDates).every(
                  (key) => lessonDates[key] === originalLessonDates[key]
                )}
                className="w-full"
              >
                {t("dialogs.editStudent.confirmDates")}
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Öğrenci Silme Bölümü */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium text-destructive">{t("dialogs.editStudent.dangerZone")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("dialogs.editStudent.dangerZoneDescription")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const confirmed = window.confirm(
                    t("dialogs.editStudent.archiveConfirmation", { name: currentName })
                  );
                  if (confirmed) {
                    setLoading(true);
                    try {
                      const { error } = await supabase
                        .from("students")
                        .update({ is_archived: true, archived_at: new Date().toISOString() })
                        .eq("id", studentId);

                      if (error) throw error;

                      toast({
                        title: t("common.success"),
                        description: t("dialogs.editStudent.archiveSuccess"),
                      });

                      onStudentUpdated();
                      onOpenChange(false);
                    } catch (error: any) {
                      toast({
                        title: t("common.error"),
                        description: error.message || t("dialogs.editStudent.archiveError"),
                        variant: "destructive",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
                disabled={loading}
                className="w-full"
              >
                <Archive className="h-4 w-4 mr-2" />
                {t("dialogs.editStudent.archive")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  const confirmed = window.confirm(
                    t("dialogs.editStudent.deleteConfirmation", { name: currentName })
                  );
                  if (confirmed) {
                    handleDeleteStudent();
                  }
                }}
                disabled={loading}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("common.delete")}
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Tarih Güncelleme Onay Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.editStudent.updateDatesTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.editStudent.updateDatesDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="update-remaining"
              checked={updateRemainingDays}
              onCheckedChange={(checked) => setUpdateRemainingDays(checked as boolean)}
            />
            <Label htmlFor="update-remaining" className="cursor-pointer font-normal">
              {t("dialogs.editStudent.updateRemainingDays")}
            </Label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUpdateRemainingDays(false)}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDateUpdate}>{t("common.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ders Sıfırlama Onay Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.editStudent.resetAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.editStudent.resetAllDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetAllLessons} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("dialogs.editStudent.reset")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
