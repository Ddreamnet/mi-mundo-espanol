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
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { checkTeacherConflicts } from "@/lib/conflictDetection";
import type { ConflictInfo } from "@/lib/conflictDetection";
import type { LessonInstance } from "@/lib/lessonTypes";
import { generateFutureInstanceDates, syncTemplateChange } from "@/lib/instanceGeneration";
import type { TemplateSlot } from "@/lib/instanceGeneration";
import { checkNonTemplateWeekday } from "@/lib/lessonSync";
import {
  completeLesson,
  undoCompleteLesson,
  resetPackage,
  archiveStudent,
  deleteStudent,
  getNextCompletableInstance,
  getLastCompletedInstance,
} from "@/lib/lessonService";


interface StudentLesson {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  note?: string;
}

interface InstanceData {
  id: string;
  lesson_number: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  status: string;
  original_date: string | null;
  rescheduled_count: number;
  package_cycle: number;
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
  const [trackingRecordId, setTrackingRecordId] = useState<string | null>(null);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [instances, setInstances] = useState<InstanceData[]>([]);
  const [studentUserId, setStudentUserId] = useState<string>("");
  const [teacherUserId, setTeacherUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [updateRemainingDays, setUpdateRemainingDays] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  // Track original instance dates for change detection
  const [originalInstanceDates, setOriginalInstanceDates] = useState<Record<string, string>>({});
  const [editedInstanceDates, setEditedInstanceDates] = useState<Record<string, string>>({});
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
      setLessons(currentLessons.length > 0 ? currentLessons : [{ dayOfWeek: 1, startTime: "", endTime: "", note: "" }]);
      setConflicts([]);
      fetchStudentIds();
    }
  }, [open, currentName, currentLessons]);

  const fetchStudentIds = async () => {
    try {
      const { data: studentData, error } = await supabase
        .from("students")
        .select("student_id, teacher_id")
        .eq("id", studentId)
        .single();

      if (error) throw error;
      setStudentUserId(studentData.student_id);
      setTeacherUserId(studentData.teacher_id);

      await Promise.all([
        fetchLessonTracking(studentData.student_id, studentData.teacher_id),
        fetchInstances(studentData.student_id, studentData.teacher_id),
      ]);
    } catch (error: any) {
      console.error("Failed to fetch student data:", error);
    }
  };

  const fetchLessonTracking = async (sid: string, tid: string) => {
    const { data: records, error } = await supabase
      .from("student_lesson_tracking")
      .select("id, lessons_per_week, package_cycle")
      .eq("student_id", sid)
      .eq("teacher_id", tid)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    if (records && records.length > 0) {
      const data = records[0];
      setTrackingRecordId(data.id);
      setCurrentCycle(data.package_cycle ?? 1);
    } else {
      setTrackingRecordId(null);
      setCurrentCycle(1);
    }
  };

  const fetchInstances = async (sid: string, tid: string) => {
    // First get current cycle
    const { data: trackingData } = await supabase
      .from("student_lesson_tracking")
      .select("package_cycle")
      .eq("student_id", sid)
      .eq("teacher_id", tid)
      .maybeSingle();

    const cycle = trackingData?.package_cycle ?? 1;
    setCurrentCycle(cycle);

    const { data, error } = await supabase
      .from("lesson_instances")
      .select("id, lesson_number, lesson_date, start_time, end_time, status, original_date, rescheduled_count, package_cycle")
      .eq("student_id", sid)
      .eq("teacher_id", tid)
      .eq("package_cycle", cycle)
      .order("lesson_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;
    const instanceData = (data || []) as InstanceData[];
    setInstances(instanceData);

    // Build original dates map for change detection
    const origDates: Record<string, string> = {};
    instanceData.forEach((inst) => {
      origDates[inst.id] = inst.lesson_date;
    });
    setOriginalInstanceDates(origDates);
    setEditedInstanceDates(origDates);
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

  const updateInstanceDate = (instanceId: string, dateStr: string) => {
    setEditedInstanceDates({
      ...editedInstanceDates,
      [instanceId]: dateStr,
    });
  };

  const handleDateSubmit = () => {
    const hasChanges = Object.keys(editedInstanceDates).some(
      (key) => editedInstanceDates[key] !== originalInstanceDates[key]
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

  // Mark next lesson as completed via RPC
  const handleMarkLastLesson = async () => {
    try {
      const nextInstance = await getNextCompletableInstance(studentUserId, teacherUserId);
      if (!nextInstance) {
        toast({
          title: t("common.info"),
          description: t("dialogs.editStudent.allCompleted"),
        });
        return;
      }

      const result = await completeLesson(nextInstance.id, teacherUserId, studentUserId);
      if (!result.success) {
        throw new Error(result.error || t("dialogs.editStudent.markError"));
      }

      toast({
        title: t("common.success"),
        description: t("dialogs.editStudent.lessonMarked", { lesson: nextInstance.lesson_number }),
      });

      // Refresh instances
      await fetchInstances(studentUserId, teacherUserId);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.editStudent.markError"),
        variant: "destructive",
      });
    }
  };

  // Undo last completed lesson via RPC
  const handleUndoLastLesson = async () => {
    try {
      const lastCompleted = await getLastCompletedInstance(studentUserId, teacherUserId);
      if (!lastCompleted) {
        toast({
          title: t("common.info"),
          description: t("dialogs.editStudent.noCompletedLessons"),
        });
        return;
      }

      const result = await undoCompleteLesson(lastCompleted.id, teacherUserId, studentUserId);
      if (!result.success) {
        throw new Error(result.error || t("dialogs.editStudent.undoError"));
      }

      toast({
        title: t("common.success"),
        description: t("dialogs.editStudent.lessonUndone", { lesson: lastCompleted.lesson_number }),
      });

      // Refresh instances
      await fetchInstances(studentUserId, teacherUserId);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.editStudent.undoError"),
        variant: "destructive",
      });
    }
  };

  // Reset package via RPC — preserves completed, increments cycle
  const handleResetAllLessons = async () => {
    try {
      const templateSlots: TemplateSlot[] = lessons.map((l) => ({
        dayOfWeek: l.dayOfWeek,
        startTime: l.startTime,
        endTime: l.endTime,
      }));

      const result = await resetPackage(studentUserId, teacherUserId, templateSlots);
      if (!result.success) {
        throw new Error(result.error || t("dialogs.editStudent.resetError"));
      }

      setShowResetConfirm(false);

      // Refresh
      await fetchInstances(studentUserId, teacherUserId);

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
      const totalLessons = lessonsPerWeek * 4;

      // Find changed instances
      const changedEntries = Object.entries(editedInstanceDates).filter(
        ([instId, newDate]) => newDate !== originalInstanceDates[instId]
      );

      if (updateRemainingDays && changedEntries.length > 0) {
        // Find the first changed instance by lesson order
        const changedInstances = changedEntries.map(([instId, newDate]) => {
          const inst = instances.find((i) => i.id === instId);
          return { instId, newDate, inst };
        }).filter((e) => e.inst).sort((a, b) => a.inst!.lesson_number - b.inst!.lesson_number);

        if (changedInstances.length > 0) {
          const firstChanged = changedInstances[0];
          const templateSlots: TemplateSlot[] = lessons.map((l) => ({
            dayOfWeek: l.dayOfWeek,
            startTime: l.startTime,
            endTime: l.endTime,
          }));

          // Generate remaining dates from the day after the changed date
          const startDate = new Date(firstChanged.newDate + "T00:00:00");
          const nextDay = new Date(startDate);
          nextDay.setDate(nextDay.getDate() + 1);

          const subsequentInstances = instances
            .filter((i) => i.lesson_number > firstChanged.inst!.lesson_number && i.status === "planned")
            .sort((a, b) => a.lesson_number - b.lesson_number);

          const remainingCount = subsequentInstances.length;
          if (remainingCount > 0) {
            const generated = generateFutureInstanceDates(templateSlots, remainingCount, nextDay);

            for (let i = 0; i < generated.length && i < subsequentInstances.length; i++) {
              const inst = subsequentInstances[i];
              editedInstanceDates[inst.id] = generated[i].lessonDate;

              await supabase
                .from("lesson_instances")
                .update({
                  lesson_date: generated[i].lessonDate,
                  start_time: generated[i].startTime,
                  end_time: generated[i].endTime,
                  original_date: inst.lesson_date !== generated[i].lessonDate ? inst.lesson_date : inst.original_date,
                  rescheduled_count: inst.lesson_date !== generated[i].lessonDate ? inst.rescheduled_count + 1 : inst.rescheduled_count,
                })
                .eq("id", inst.id);
            }
          }
        }
      }

      // Recalculate changed entries after potential "update remaining" modifications
      const finalChangedEntries = Object.entries(editedInstanceDates).filter(
        ([instId, newDate]) => newDate !== originalInstanceDates[instId]
      );

      // Conflict check for each changed instance
      for (const [instId, newDate] of finalChangedEntries) {
        const inst = instances.find((i) => i.id === instId);
        if (!inst || inst.status === "completed") continue;

        const foundConflicts = await checkTeacherConflicts(
          teacherUserId,
          newDate,
          inst.start_time,
          inst.end_time,
          instId,
          studentUserId
        );

        if (foundConflicts.length > 0) {
          setConflicts(foundConflicts);
          toast({
            title: t("dialogs.editStudent.conflictFound"),
            description: `${foundConflicts[0].studentName} ile ${foundConflicts[0].timeRange} saatlerinde çakışma var.`,
            variant: "destructive",
          });
          return;
        }
      }

      // Update instances in DB
      for (const [instId, newDate] of finalChangedEntries) {
        const inst = instances.find((i) => i.id === instId);
        if (!inst || inst.status === "completed") continue;

        await supabase
          .from("lesson_instances")
          .update({
            lesson_date: newDate,
            original_date: inst.lesson_date !== newDate ? inst.lesson_date : inst.original_date,
            rescheduled_count: inst.lesson_date !== newDate ? inst.rescheduled_count + 1 : inst.rescheduled_count,
          })
          .eq("id", instId);
      }

      // Check non-template weekday for the first changed date
      if (finalChangedEntries.length > 0) {
        await checkNonTemplateWeekday(studentUserId, teacherUserId, finalChangedEntries[0][1]);
      }

      toast({
        title: t("common.success"),
        description: t("dialogs.editStudent.datesUpdated"),
      });

      setShowConfirm(false);
      setUpdateRemainingDays(false);

      // Refresh instances
      await fetchInstances(studentUserId, teacherUserId);
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
      // Update name
      await supabase
        .from("profiles")
        .update({ full_name: name.trim() })
        .eq("user_id", studentUserId);

      // Delete old template and insert new
      await supabase
        .from("student_lessons")
        .delete()
        .eq("student_id", studentUserId)
        .eq("teacher_id", teacherUserId);

      const lessonsToInsert = lessons.map((lesson) => ({
        student_id: studentUserId,
        teacher_id: teacherUserId,
        day_of_week: lesson.dayOfWeek,
        start_time: lesson.startTime,
        end_time: lesson.endTime,
        note: lesson.note || null,
      }));

      await supabase.from("student_lessons").insert(lessonsToInsert);

      // Sync instances with new template
      const totalLessons = lessonsPerWeek * 4;
      const newSlots: TemplateSlot[] = lessons.map((l) => ({
        dayOfWeek: l.dayOfWeek,
        startTime: l.startTime,
        endTime: l.endTime,
      }));

      if (instances.length > 0) {
        // Instances exist: sync template change (cycle-aware)
        const result = await syncTemplateChange(studentUserId, teacherUserId, newSlots, totalLessons);
        if (!result.success && result.conflicts.length > 0) {
          toast({
            title: t("dialogs.editStudent.conflictFound"),
            description: `Template değişikliği ${result.conflicts.length} çakışma oluşturuyor. Yine de template kaydedildi.`,
            variant: "destructive",
          });
        }

        // Sync lessons_per_week in tracking record
        await supabase
          .from("student_lesson_tracking")
          .update({ lessons_per_week: lessonsPerWeek })
          .eq("student_id", studentUserId)
          .eq("teacher_id", teacherUserId);
      } else {
        // No instances yet: generate from scratch + create tracking
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const generated = generateFutureInstanceDates(newSlots, totalLessons, today);

        for (let i = 0; i < generated.length; i++) {
          await supabase.from("lesson_instances").insert({
            student_id: studentUserId,
            teacher_id: teacherUserId,
            lesson_number: i + 1,
            lesson_date: generated[i].lessonDate,
            start_time: generated[i].startTime,
            end_time: generated[i].endTime,
            status: "planned",
            package_cycle: currentCycle,
            rescheduled_count: 0,
          });
        }

        // Ensure tracking record exists
        const { data: trackingRecords } = await supabase
          .from("student_lesson_tracking")
          .select("id")
          .eq("student_id", studentUserId)
          .eq("teacher_id", teacherUserId)
          .limit(1);

        if (!trackingRecords || trackingRecords.length === 0) {
          await supabase.from("student_lesson_tracking").insert({
            student_id: studentUserId,
            teacher_id: teacherUserId,
            lessons_per_week: lessonsPerWeek,
            completed_lessons: [],
            lesson_dates: {},
            package_cycle: 1,
          });
        } else {
          await supabase
            .from("student_lesson_tracking")
            .update({ lessons_per_week: lessonsPerWeek })
            .eq("id", trackingRecords[0].id);
        }
      }

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

  // Archive via RPC
  const handleArchiveStudent = async () => {
    const confirmed = window.confirm(t("dialogs.editStudent.archiveConfirmation", { name: currentName }));
    if (!confirmed) return;

    setLoading(true);
    try {
      const result = await archiveStudent(studentId, studentUserId, teacherUserId);
      if (!result.success) {
        throw new Error(result.error || t("dialogs.editStudent.archiveError"));
      }

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
  };

  // Delete via RPC + edge function for auth user
  const handleDeleteStudent = async () => {
    const confirmed = window.confirm(t("dialogs.editStudent.deleteConfirmation", { name: currentName }));
    if (!confirmed) return;

    setLoading(true);
    try {
      const result = await deleteStudent(studentId, studentUserId, teacherUserId);
      if (!result.success) {
        throw new Error(result.error || t("dialogs.editStudent.deleteError"));
      }

      // Delete user from auth
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("delete-user", {
        body: { userId: studentUserId },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to delete user account");
      }

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

  // Derive completed count from instances
  const completedCount = instances.filter((i) => i.status === "completed").length;
  const totalLessons = lessonsPerWeek * 4;

  // Build sorted lessons for display — instance-based, cycle-filtered
  const sortedLessonsForDisplay = (() => {
    if (instances.length > 0) {
      const sorted = [...instances]
        .sort((a, b) => {
          const dateCompare = a.lesson_date.localeCompare(b.lesson_date);
          if (dateCompare !== 0) return dateCompare;
          return a.start_time.localeCompare(b.start_time);
        });

      const capped = sorted.slice(0, totalLessons);

      const result = capped.map((inst, idx) => ({
        lessonNumber: inst.lesson_number,
        displayIndex: idx + 1,
        effectiveDate: inst.lesson_date,
        startTime: inst.start_time,
        endTime: inst.end_time,
        isCompleted: inst.status === "completed",
        instanceId: inst.id,
      }));

      // Pad with empty slots if needed
      while (result.length < totalLessons) {
        result.push({
          lessonNumber: result.length + 1,
          displayIndex: result.length + 1,
          effectiveDate: "",
          startTime: "",
          endTime: "",
          isCompleted: false,
          instanceId: "",
        });
      }

      return result;
    }

    // No instances yet
    const result = [];
    for (let i = 1; i <= totalLessons; i++) {
      result.push({
        lessonNumber: i,
        displayIndex: i,
        effectiveDate: "",
        startTime: "",
        endTime: "",
        isCompleted: false,
        instanceId: "",
      });
    }
    return result;
  })();

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
            <Select value={lessonsPerWeek.toString()} onValueChange={(value) => setLessonsPerWeek(Number(value))}>
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

          {/* Completed Lessons Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">{t("dialogs.editStudent.completedLessonsTitle")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("dialogs.editStudent.completedLessonsDescription")}
                  {" "}({completedCount}/{totalLessons})
                </p>
              </div>
              <div className="flex gap-2">
                {completedCount < totalLessons && (
                  <Button type="button" variant="default" size="sm" onClick={handleMarkLastLesson} disabled={loading}>
                    {t("dialogs.editStudent.markLastLesson")}
                  </Button>
                )}
                {completedCount > 0 && (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={handleUndoLastLesson} disabled={loading}>
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
              {sortedLessonsForDisplay.map((lesson, displayIndex) => (
                <div
                  key={lesson.instanceId || lesson.lessonNumber}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className={`h-4 w-4 rounded-full ${
                        lesson.isCompleted
                          ? "bg-primary"
                          : "bg-muted"
                      }`}
                    />
                    <span
                      className={`font-medium ${
                        lesson.isCompleted
                          ? "text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {t("dialogs.editStudent.lesson")} {displayIndex + 1}
                    </span>
                    {/* Show time range */}
                    {lesson.startTime && (
                      <span className="text-xs text-muted-foreground ml-1">
                        {lesson.startTime.slice(0, 5)} - {lesson.endTime.slice(0, 5)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">
                      {t("dialogs.editStudent.dateLabel")}
                    </Label>
                    <Input
                      type="date"
                      value={lesson.instanceId ? (editedInstanceDates[lesson.instanceId] || lesson.effectiveDate) : ""}
                      onChange={(e) => {
                        if (lesson.instanceId) {
                          updateInstanceDate(lesson.instanceId, e.target.value);
                        }
                      }}
                      className="w-40"
                      disabled={lesson.isCompleted || !lesson.instanceId}
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="default"
                onClick={handleDateSubmit}
                disabled={
                  loading || Object.keys(editedInstanceDates).every(
                    (key) => editedInstanceDates[key] === originalInstanceDates[key]
                  )
                }
                className="w-full"
              >
                {t("dialogs.editStudent.confirmDates")}
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Danger Zone */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium text-destructive">{t("dialogs.editStudent.dangerZone")}</Label>
                <p className="text-sm text-muted-foreground">{t("dialogs.editStudent.dangerZoneDescription")}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleArchiveStudent}
                disabled={loading}
                className="w-full"
              >
                <Archive className="h-4 w-4 mr-2" />
                {t("dialogs.editStudent.archive")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteStudent}
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

      {/* Date Update Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.editStudent.updateDatesTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("dialogs.editStudent.updateDatesDescription")}</AlertDialogDescription>
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

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.editStudent.resetAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("dialogs.editStudent.resetAllDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetAllLessons}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("dialogs.editStudent.reset")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
