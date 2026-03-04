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
import {
  addRegularLessonBalance,
  subtractRegularLessonBalance,
} from "@/lib/teacherBalance";
import { checkTeacherConflicts } from "@/lib/conflictDetection";
import type { ConflictInfo } from "@/lib/conflictDetection";
import type { LessonInstance } from "@/lib/lessonTypes";
import { generateFutureInstanceDates, syncTemplateChange } from "@/lib/instanceGeneration";
import type { TemplateSlot } from "@/lib/instanceGeneration";
import { rebuildLegacyLessonDatesFromInstances, checkNonTemplateWeekday } from "@/lib/lessonSync";


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

interface InstanceData {
  id: string;
  lesson_number: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  status: string;
  original_date: string | null;
  rescheduled_count: number;
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
  const [instances, setInstances] = useState<InstanceData[]>([]);
  const [studentUserId, setStudentUserId] = useState<string>("");
  const [teacherUserId, setTeacherUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [updateRemainingDays, setUpdateRemainingDays] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const { toast } = useToast();

  // instanceIdMap: lesson_number -> id
  const instanceIdMap: Record<string, string> = {};
  instances.forEach((inst) => {
    instanceIdMap[inst.lesson_number.toString()] = inst.id;
  });

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
        fetchLessonOverrides(studentData.student_id, studentData.teacher_id),
        fetchInstances(studentData.student_id, studentData.teacher_id),
      ]);
    } catch (error: any) {
      console.error("Failed to fetch student data:", error);
    }
  };

  const fetchLessonTracking = async (sid: string, tid: string) => {
    const { data: records, error } = await supabase
      .from("student_lesson_tracking")
      .select("*")
      .eq("student_id", sid)
      .eq("teacher_id", tid)
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
  };

  const fetchLessonOverrides = async (sid: string, tid: string) => {
    const { data, error } = await supabase
      .from("lesson_overrides")
      .select("id, original_date, new_date, is_cancelled")
      .eq("student_id", sid)
      .eq("teacher_id", tid);

    if (error) throw error;
    setLessonOverrides(data || []);
  };

  const fetchInstances = async (sid: string, tid: string) => {
    const { data, error } = await supabase
      .from("lesson_instances")
      .select("id, lesson_number, lesson_date, start_time, end_time, status, original_date, rescheduled_count")
      .eq("student_id", sid)
      .eq("teacher_id", tid)
      .order("lesson_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;
    setInstances(data || []);
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

  const handleDateSubmit = () => {
    const hasChanges = Object.keys(lessonDates).some((key) => lessonDates[key] !== originalLessonDates[key]);

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

      const nextLesson = completedLessons.length === 0 ? 1 : Math.max(...completedLessons) + 1;
      const newCompletedLessons = [...completedLessons, nextLesson].sort((a, b) => a - b);

      const { data: existingRecords } = await supabase
        .from("student_lesson_tracking")
        .select("id")
        .eq("student_id", studentUserId)
        .eq("teacher_id", teacherUserId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (!existingRecords || existingRecords.length === 0) {
        throw new Error(t("dialogs.editStudent.trackingNotFound"));
      }

      await supabase
        .from("student_lesson_tracking")
        .update({ completed_lessons: newCompletedLessons })
        .eq("id", existingRecords[0].id);

      // Update lesson_instances status
      const matchingInstance = instances.find((i) => i.lesson_number === nextLesson);
      if (matchingInstance) {
        await supabase
          .from("lesson_instances")
          .update({ status: "completed" })
          .eq("id", matchingInstance.id);
        await addRegularLessonBalance(teacherUserId, studentUserId, matchingInstance.id);
      } else {
        await addRegularLessonBalance(teacherUserId, studentUserId);
      }

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

      const lastLesson = Math.max(...completedLessons);
      const newCompletedLessons = completedLessons.filter((l) => l !== lastLesson);

      const { data: existingRecords } = await supabase
        .from("student_lesson_tracking")
        .select("id")
        .eq("student_id", studentUserId)
        .eq("teacher_id", teacherUserId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (!existingRecords || existingRecords.length === 0) {
        throw new Error(t("dialogs.editStudent.trackingNotFound"));
      }

      await supabase
        .from("student_lesson_tracking")
        .update({ completed_lessons: newCompletedLessons })
        .eq("id", existingRecords[0].id);

      // Update instance back to planned
      const matchingInstance = instances.find((i) => i.lesson_number === lastLesson);
      if (matchingInstance) {
        await supabase
          .from("lesson_instances")
          .update({ status: "planned" })
          .eq("id", matchingInstance.id);
        await subtractRegularLessonBalance(teacherUserId, studentUserId, matchingInstance.id);
      }

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

  const handleResetAllLessons = async () => {
    try {
      // 1. Delete ALL instances
      await supabase
        .from("lesson_instances")
        .delete()
        .eq("student_id", studentUserId)
        .eq("teacher_id", teacherUserId);

      // 2. Regenerate from template
      const templateSlots: TemplateSlot[] = lessons.map((l) => ({
        dayOfWeek: l.dayOfWeek,
        startTime: l.startTime,
        endTime: l.endTime,
      }));

      const totalLessons = lessonsPerWeek * 4;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const generated = generateFutureInstanceDates(templateSlots, totalLessons, today);

      // 3. Insert new instances
      for (let i = 0; i < generated.length; i++) {
        await supabase.from("lesson_instances").insert({
          student_id: studentUserId,
          teacher_id: teacherUserId,
          lesson_number: i + 1,
          lesson_date: generated[i].lessonDate,
          start_time: generated[i].startTime,
          end_time: generated[i].endTime,
          status: "planned",
          rescheduled_count: 0,
        });
      }

      // 4. Update tracking
      const { data: existingRecords } = await supabase
        .from("student_lesson_tracking")
        .select("id")
        .eq("student_id", studentUserId)
        .eq("teacher_id", teacherUserId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (existingRecords && existingRecords.length > 0) {
        await supabase
          .from("student_lesson_tracking")
          .update({ completed_lessons: [], lesson_dates: {} })
          .eq("id", existingRecords[0].id);
      }

      setCompletedLessons([]);
      setLessonDates({});
      setOriginalLessonDates({});
      setShowResetConfirm(false);

      // Refresh instances
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
      let finalDates = { ...lessonDates };
      const lessonDays = lessons.map((l) => l.dayOfWeek).sort((a, b) => a - b);
      const totalLessons = lessonsPerWeek * 4;

      if (updateRemainingDays) {
        const changedKeys = Object.keys(lessonDates).filter(
          (key) => lessonDates[key] !== originalLessonDates[key]
        );

        if (changedKeys.length > 0) {
          const firstChangedLesson = Math.min(...changedKeys.map(Number));
          
          // Build template slots from current lessons
          const templateSlots: TemplateSlot[] = lessons.map((l) => ({
            dayOfWeek: l.dayOfWeek,
            startTime: l.startTime,
            endTime: l.endTime,
          }));

          // Keep the manually changed date for firstChangedLesson
          finalDates[firstChangedLesson.toString()] = lessonDates[firstChangedLesson.toString()];

          // Regenerate remaining lessons using template-aware generation
          const remainingCount = totalLessons - firstChangedLesson;
          if (remainingCount > 0) {
            const startDate = new Date(lessonDates[firstChangedLesson.toString()] + "T00:00:00");
            // Start from the day after the changed date
            const nextDay = new Date(startDate);
            nextDay.setDate(nextDay.getDate() + 1);
            const generated = generateFutureInstanceDates(templateSlots, remainingCount, nextDay);

            // Map generated dates to lesson numbers
            for (let i = 0; i < generated.length; i++) {
              const lessonNum = firstChangedLesson + 1 + i;
              if (lessonNum <= totalLessons) {
                finalDates[lessonNum.toString()] = generated[i].lessonDate;
                
                // Also update instance times if instance exists
                const instId = instanceIdMap[lessonNum.toString()];
                if (instId) {
                  const inst = instances.find((ins) => ins.id === instId);
                  if (inst && inst.status === "planned") {
                    await supabase
                      .from("lesson_instances")
                      .update({
                        lesson_date: generated[i].lessonDate,
                        start_time: generated[i].startTime,
                        end_time: generated[i].endTime,
                        original_date: inst.lesson_date !== generated[i].lessonDate ? inst.lesson_date : inst.original_date,
                        rescheduled_count: inst.lesson_date !== generated[i].lessonDate ? inst.rescheduled_count + 1 : inst.rescheduled_count,
                      })
                      .eq("id", instId);
                  }
                }
              }
            }
          }
        }
      }

      // Determine which dates actually changed
      const changedEntries = Object.entries(finalDates).filter(
        ([key, val]) => val !== originalLessonDates[key]
      );

      // Conflict check for each changed instance
      for (const [key, newDate] of changedEntries) {
        const instId = instanceIdMap[key];
        const inst = instances.find((i) => i.lesson_number === Number(key));
        if (!inst) continue;

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
            title: "Çakışma bulundu!",
            description: `${foundConflicts[0].studentName} ile ${foundConflicts[0].timeRange} saatlerinde çakışma var.`,
            variant: "destructive",
          });
          return;
        }
      }

      // Update instances in DB
      for (const [key, newDate] of changedEntries) {
        const instId = instanceIdMap[key];
        if (instId) {
          const inst = instances.find((i) => i.id === instId);
          await supabase
            .from("lesson_instances")
            .update({
              lesson_date: newDate,
              original_date: inst?.status === "planned" ? (inst.lesson_date !== newDate ? inst.lesson_date : inst.lesson_date) : undefined,
              rescheduled_count: (inst as any)?.rescheduled_count ? (inst as any).rescheduled_count + 1 : 1,
            })
            .eq("id", instId);
        }
      }

      // Rebuild legacy sync
      const rebuiltDates = await rebuildLegacyLessonDatesFromInstances(studentUserId, teacherUserId);

      // Check non-template weekday for the first changed date
      if (changedEntries.length > 0) {
        await checkNonTemplateWeekday(studentUserId, teacherUserId, changedEntries[0][1]);
      }

      toast({
        title: t("common.success"),
        description: t("dialogs.editStudent.datesUpdated"),
      });

      setOriginalLessonDates(rebuiltDates);
      setLessonDates(rebuiltDates);
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
        // Instances exist: sync template change
        const result = await syncTemplateChange(studentUserId, teacherUserId, newSlots, totalLessons);
        if (!result.success && result.conflicts.length > 0) {
          toast({
            title: "Çakışma bulundu!",
            description: `Template değişikliği ${result.conflicts.length} çakışma oluşturuyor. Yine de template kaydedildi.`,
            variant: "destructive",
          });
        }

        // Rebuild legacy dates
        const rebuiltDates = await rebuildLegacyLessonDatesFromInstances(studentUserId, teacherUserId);
        setLessonDates(rebuiltDates);
        setOriginalLessonDates(rebuiltDates);
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

  const handleDeleteStudent = async () => {
    setLoading(true);
    try {
      // Delete all related data
      const { data: topics } = await supabase
        .from("topics")
        .select("id")
        .eq("student_id", studentUserId)
        .eq("teacher_id", teacherUserId);

      if (topics && topics.length > 0) {
        const topicIds = topics.map((t) => t.id);
        await supabase.from("resources").delete().in("topic_id", topicIds);
        await supabase.from("topics").delete().in("id", topicIds);
      }

      await supabase.from("student_resource_completion").delete().eq("student_id", studentUserId);

      await supabase
        .from("lesson_instances")
        .delete()
        .eq("student_id", studentUserId)
        .eq("teacher_id", teacherUserId);

      await supabase
        .from("student_lesson_tracking")
        .delete()
        .eq("student_id", studentUserId)
        .eq("teacher_id", teacherUserId);

      await supabase
        .from("student_lessons")
        .delete()
        .eq("student_id", studentUserId)
        .eq("teacher_id", teacherUserId);

      await supabase
        .from("homework_submissions")
        .delete()
        .eq("student_id", studentUserId)
        .eq("teacher_id", teacherUserId);

      await supabase.from("students").delete().eq("id", studentId);

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

  // Build sorted lessons for display — instance-based path
  const sortedLessonsForDisplay = (() => {
    const totalLessons = lessonsPerWeek * 4;
    const datesUnassigned = Object.keys(lessonDates).length === 0;

    if (instances.length > 0) {
      // Sort by (lesson_date, start_time) chronologically
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
        effectiveDate: datesUnassigned ? "" : inst.lesson_date,
        startTime: inst.start_time,
        endTime: inst.end_time,
        isCancelled: inst.status === "cancelled",
        isCompleted: completedLessons.includes(inst.lesson_number),
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
          isCancelled: false,
          isCompleted: false,
          instanceId: "",
        });
      }

      return result;
    }

    // Legacy fallback
    type LessonDisplayItem = { lessonNumber: number; displayIndex: number; effectiveDate: string; startTime: string; endTime: string; isCancelled: boolean; isCompleted: boolean; instanceId: string };
    const lessonsWithDates: LessonDisplayItem[] = [];
    for (let i = 1; i <= totalLessons; i++) {
      const originalDate = lessonDates[i.toString()];
      const override = originalDate ? lessonOverrides.find((o) => o.original_date === originalDate) : undefined;
      const isCancelled = override?.is_cancelled || false;
      const effectiveDate =
        override && override.new_date && !isCancelled ? override.new_date : (originalDate || "");

      lessonsWithDates.push({
        lessonNumber: i,
        displayIndex: i,
        effectiveDate,
        startTime: "",
        endTime: "",
        isCancelled,
        isCompleted: completedLessons.includes(i),
        instanceId: "",
      });
    }

    return lessonsWithDates
      .filter((l) => l.effectiveDate)
      .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
      .concat(lessonsWithDates.filter((l) => !l.effectiveDate));
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

          {/* İşlenen Dersler Bölümü */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">{t("dialogs.editStudent.completedLessonsTitle")}</Label>
                <p className="text-sm text-muted-foreground">{t("dialogs.editStudent.completedLessonsDescription")}</p>
              </div>
              <div className="flex gap-2">
                {completedLessons.length < lessonsPerWeek * 4 && (
                  <Button type="button" variant="default" size="sm" onClick={handleMarkLastLesson} disabled={loading}>
                    {t("dialogs.editStudent.markLastLesson")}
                  </Button>
                )}
                {completedLessons.length > 0 && (
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
                  className={`flex items-center gap-3 p-3 border rounded-lg ${
                    lesson.isCancelled ? "opacity-50 bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className={`h-4 w-4 rounded-full ${
                        lesson.isCancelled
                          ? "bg-muted-foreground"
                          : lesson.isCompleted
                            ? "bg-primary"
                            : "bg-muted"
                      }`}
                    />
                    <span
                      className={`font-medium ${
                        lesson.isCancelled
                          ? "text-muted-foreground line-through"
                          : lesson.isCompleted
                            ? "text-primary-foreground"
                            : "text-rose-950 dark:text-rose-900"
                      }`}
                    >
                      {t("dialogs.editStudent.lesson")} {displayIndex + 1}
                      {lesson.isCancelled && ` (${t("dialogs.editStudent.cancelled")})`}
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
                      value={lesson.effectiveDate || lessonDates[lesson.lessonNumber.toString()] || ""}
                      onChange={(e) => updateLessonDate(lesson.lessonNumber, e.target.value)}
                      className="w-40"
                      disabled={lesson.isCancelled}
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="default"
                onClick={handleDateSubmit}
                disabled={
                  loading || Object.keys(lessonDates).every((key) => lessonDates[key] === originalLessonDates[key])
                }
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
                <p className="text-sm text-muted-foreground">{t("dialogs.editStudent.dangerZoneDescription")}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const confirmed = window.confirm(t("dialogs.editStudent.archiveConfirmation", { name: currentName }));
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
                  const confirmed = window.confirm(t("dialogs.editStudent.deleteConfirmation", { name: currentName }));
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

      {/* Ders Sıfırlama Onay Dialog */}
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
