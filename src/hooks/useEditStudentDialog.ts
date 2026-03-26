/**
 * Hook extracted from EditStudentDialog — mirrors EWD's useEditStudentDialog.ts
 * with MME i18n (useTranslation) adaptation.
 */

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { LessonInstance } from "@/lib/lessonTypes";
import { formatTime } from "@/lib/lessonTypes";
import {
  completeLesson,
  undoCompleteLesson,
  resetPackage,
  archiveStudent,
  deleteStudent,
  getNextCompletableInstance,
  getLastCompletedInstance,
} from "@/lib/lessonService";
import { TemplateSlot, generateFutureInstanceDates, getSlotBefore } from "@/lib/instanceGeneration";
import { startOfDay, format } from "date-fns";
import { checkTeacherConflicts, ConflictInfo } from "@/lib/conflictDetection";
import { checkNonTemplateWeekday } from "@/lib/lessonSync";
import { clearWeekCache } from "@/hooks/useScheduleGrid";
import type { StudentLessonBase } from "@/lib/types";

interface UseEditStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentUpdated: () => void;
  studentId: string;
  currentName: string;
  currentLessons: StudentLessonBase[];
}

type LessonDates = Record<string, string>;

export function useEditStudentDialog({
  open,
  onOpenChange,
  onStudentUpdated,
  studentId,
  currentName,
  currentLessons,
}: UseEditStudentDialogProps) {
  const [name, setName] = useState("");
  const [lessonsPerWeek, setLessonsPerWeek] = useState(1);
  const [lessons, setLessons] = useState<StudentLessonBase[]>([{ dayOfWeek: 1, startTime: "", endTime: "", note: "" }]);
  const [lessonDates, setLessonDates] = useState<LessonDates>({});
  const [originalLessonDates, setOriginalLessonDates] = useState<LessonDates>({});
  const [instances, setInstances] = useState<LessonInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [shifting, setShifting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [updateRemainingDays, setUpdateRemainingDays] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [studentUserId, setStudentUserId] = useState("");
  const [teacherUserId, setTeacherUserId] = useState("");
  const [canShiftBackward, setCanShiftBackward] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (open) {
      setName(currentName);
      setLessonsPerWeek(currentLessons.length || 1);
      setLessons(
        currentLessons.length > 0
          ? currentLessons
          : [{ dayOfWeek: 1, startTime: "", endTime: "", note: "" }]
      );
      setConflicts([]);
      initializeDialog();
    }
  }, [open, currentName, currentLessons]);

  const initializeDialog = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("student_id, teacher_id")
        .eq("id", studentId)
        .single();

      if (error || !data) return;

      const sUserId = data.student_id;
      const tUserId = data.teacher_id;
      setStudentUserId(sUserId);
      setTeacherUserId(tUserId);

      const [trackingResult, instanceResult] = await Promise.all([
        supabase
          .from("student_lesson_tracking")
          .select("package_cycle")
          .eq("student_id", sUserId)
          .eq("teacher_id", tUserId)
          .maybeSingle(),
        supabase
          .from("lesson_instances")
          .select("*")
          .eq("student_id", sUserId)
          .eq("teacher_id", tUserId)
          .in("status", ["planned", "completed"])
          .order("lesson_date", { ascending: true })
          .order("start_time", { ascending: true }),
      ]);

      const currentCycle = trackingResult.data?.package_cycle ?? 1;
      const allInstances = (instanceResult.data || []) as LessonInstance[];
      const fetchedInstances = allInstances.filter((i) => i.package_cycle === currentCycle);
      setInstances(fetchedInstances);

      const dates: LessonDates = {};
      fetchedInstances.forEach((inst) => {
        dates[inst.lesson_number.toString()] = inst.lesson_date;
      });
      setLessonDates(dates);
      setOriginalLessonDates(dates);
    } catch (error: any) {
      console.error("Failed to initialize dialog:", error);
    }
  };

  const fetchInstances = async () => {
    if (!studentUserId || !teacherUserId) return;
    try {
      const [trackingResult, instanceResult] = await Promise.all([
        supabase
          .from("student_lesson_tracking")
          .select("package_cycle")
          .eq("student_id", studentUserId)
          .eq("teacher_id", teacherUserId)
          .maybeSingle(),
        supabase
          .from("lesson_instances")
          .select("*")
          .eq("student_id", studentUserId)
          .eq("teacher_id", teacherUserId)
          .in("status", ["planned", "completed"])
          .order("lesson_date", { ascending: true })
          .order("start_time", { ascending: true }),
      ]);

      const currentCycle = trackingResult.data?.package_cycle ?? 1;
      const allInstances = (instanceResult.data || []) as LessonInstance[];
      const fetchedInstances = allInstances.filter((i) => i.package_cycle === currentCycle);
      setInstances(fetchedInstances);

      const dates: LessonDates = {};
      fetchedInstances.forEach((inst) => {
        dates[inst.lesson_number.toString()] = inst.lesson_date;
      });
      setLessonDates(dates);
      setOriginalLessonDates(dates);
    } catch (error: any) {
      console.error("Failed to fetch lesson instances:", error);
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

  const updateLesson = (index: number, field: keyof StudentLessonBase, value: string | number) => {
    const updatedLessons = [...lessons];
    updatedLessons[index] = { ...updatedLessons[index], [field]: value };
    setLessons(updatedLessons);
  };

  // Instance ID map for direct DB updates
  const instanceIdMap: Record<string, string> = {};
  if (instances.length > 0) {
    const sorted = [...instances].sort((a, b) => {
      const dateCompare = a.lesson_date.localeCompare(b.lesson_date);
      if (dateCompare !== 0) return dateCompare;
      return a.start_time.localeCompare(b.start_time);
    });
    sorted.forEach((inst) => {
      instanceIdMap[inst.lesson_number.toString()] = inst.id;
    });
  }

  const updateLessonDate = (lessonNumber: number, dateStr: string) => {
    setLessonDates({ ...lessonDates, [lessonNumber.toString()]: dateStr });
  };

  const findInstanceForLesson = (lessonNumber: number): LessonInstance | undefined => {
    return instances.find((inst) => inst.lesson_number === lessonNumber);
  };

  const handleDateSubmit = () => {
    const hasChanges = Object.keys(lessonDates).some(
      (key) => lessonDates[key] !== originalLessonDates[key]
    );
    if (hasChanges) {
      setShowConfirm(true);
    } else {
      toast({ title: t("common.info"), description: t("dialogs.editStudent.noChanges") });
    }
  };

  const handleMarkLastLesson = async () => {
    try {
      const nextInst = await getNextCompletableInstance(studentUserId, teacherUserId);
      if (!nextInst) {
        toast({ title: t("common.info"), description: t("dialogs.editStudent.allCompleted") });
        return;
      }
      const result = await completeLesson(nextInst.id, teacherUserId, studentUserId);
      if (!result.success) {
        toast({ title: t("common.error"), description: result.error || t("dialogs.editStudent.markError"), variant: "destructive" });
        return;
      }
      await fetchInstances();
      toast({ title: t("common.success"), description: t("dialogs.editStudent.lessonMarked", { lesson: nextInst.lesson_number }) });
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("dialogs.editStudent.markError"), variant: "destructive" });
    }
  };

  const handleUndoLastLesson = async () => {
    try {
      const lastInst = await getLastCompletedInstance(studentUserId, teacherUserId);
      if (!lastInst) {
        toast({ title: t("common.info"), description: t("dialogs.editStudent.noCompletedLessons") });
        return;
      }
      const result = await undoCompleteLesson(lastInst.id, teacherUserId, studentUserId);
      if (!result.success) {
        toast({ title: t("common.error"), description: result.error || t("dialogs.editStudent.undoError"), variant: "destructive" });
        return;
      }
      await fetchInstances();
      toast({ title: t("common.success"), description: t("dialogs.editStudent.lessonUndone", { lesson: lastInst.lesson_number }) });
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("dialogs.editStudent.undoError"), variant: "destructive" });
    }
  };

  const handleResetAllLessons = async () => {
    try {
      const templateSlots: TemplateSlot[] = lessons.map((l) => ({
        dayOfWeek: l.dayOfWeek,
        startTime: l.startTime,
        endTime: l.endTime,
      }));
      const result = await resetPackage(studentUserId, teacherUserId, templateSlots);
      if (!result.success) {
        toast({ title: t("common.error"), description: result.error || t("dialogs.editStudent.resetError"), variant: "destructive" });
        return;
      }
      setLessonDates({});
      setOriginalLessonDates({});
      setShowResetConfirm(false);
      await fetchInstances();
      toast({
        title: t("common.success"),
        description: t("dialogs.editStudent.resetSuccess"),
      });
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("dialogs.editStudent.resetError"), variant: "destructive" });
    }
  };

  /** Shared logic for batch date updates with conflict checks. */
  const batchUpdateInstances = async (
    changedKeys: string[],
    finalDatesRef: { current: LessonDates }
  ) => {
    const changeEntries = changedKeys
      .map((key) => {
        const instId = instanceIdMap[key];
        const inst = instId ? instances.find((i) => i.id === instId) : findInstanceForLesson(parseInt(key));
        return { key, inst };
      })
      .filter((e) => e.inst != null);

    const templateSlots: TemplateSlot[] = lessons
      .map((l) => ({ dayOfWeek: l.dayOfWeek, startTime: l.startTime, endTime: l.endTime }))
      .sort((a, b) => a.dayOfWeek !== b.dayOfWeek ? a.dayOfWeek - b.dayOfWeek : a.startTime.localeCompare(b.startTime));

    const usedSlotsPerDate: Record<string, number> = {};
    const updates = changeEntries.map((e) => {
      const newDate = finalDatesRef.current[e.key];
      const newDow = new Date(newDate + "T00:00:00").getDay();
      const matchingSlots = templateSlots.filter(s => s.dayOfWeek === newDow);
      const usedCount = usedSlotsPerDate[newDate] || 0;
      const slotIdx = Math.min(usedCount, Math.max(0, matchingSlots.length - 1));
      const matchedSlot = matchingSlots[slotIdx];
      usedSlotsPerDate[newDate] = usedCount + 1;

      return {
        ...e,
        newStartTime: matchedSlot?.startTime || e.inst!.start_time,
        newEndTime: matchedSlot?.endTime || e.inst!.end_time,
      };
    });

    const conflictResults = await Promise.all(
      updates.map((u) =>
        checkTeacherConflicts(teacherUserId, finalDatesRef.current[u.key], u.newStartTime, u.newEndTime, u.inst!.id, studentUserId)
      )
    );
    const allConflicts = conflictResults.flat();
    if (allConflicts.length > 0) setConflicts(allConflicts);

    const batchResults = await Promise.all(
      updates.map((u) =>
        supabase
          .from("lesson_instances")
          .update({
            lesson_date: finalDatesRef.current[u.key],
            start_time: u.newStartTime,
            end_time: u.newEndTime,
            original_date: u.inst!.original_date || u.inst!.lesson_date,
            original_start_time: u.inst!.original_start_time || u.inst!.start_time,
            original_end_time: u.inst!.original_end_time || u.inst!.end_time,
            rescheduled_count: u.inst!.rescheduled_count + 1,
          })
          .eq("id", u.inst!.id)
      )
    );
    const batchErrors = batchResults.filter(r => r.error);
    if (batchErrors.length > 0) {
      throw new Error(`Instance güncelleme hatası: ${batchErrors.map(e => e.error?.message).join(', ')}`);
    }

    return updates;
  };

  const confirmDateUpdate = async () => {
    try {
      const finalDatesRef = { current: { ...lessonDates } };
      const changedKeys = Object.keys(lessonDates).filter(
        (key) => lessonDates[key] !== originalLessonDates[key]
      );

      if (updateRemainingDays && changedKeys.length > 0 && instances.length > 0) {
        const updates = await batchUpdateInstances(changedKeys, finalDatesRef);

        const templateSlots: TemplateSlot[] = lessons.map((l) => ({
          dayOfWeek: l.dayOfWeek,
          startTime: l.startTime,
          endTime: l.endTime,
        }));

        const allSorted = [...instances].sort((a, b) => {
          const dc = a.lesson_date.localeCompare(b.lesson_date);
          return dc !== 0 ? dc : a.start_time.localeCompare(b.start_time);
        });

        const changedInstanceIds = new Set(changedKeys.map((k) => instanceIdMap[k]).filter(Boolean));
        let lastChangedIdx = -1;
        allSorted.forEach((inst, idx) => {
          if (changedInstanceIds.has(inst.id)) lastChangedIdx = idx;
        });

        const plannedAfterChanged = allSorted
          .slice(lastChangedIdx + 1)
          .filter((inst) => inst.status === "planned");

        if (plannedAfterChanged.length > 0) {
          const lastChangedKey = changedKeys.reduce((a, b) => (Number(a) > Number(b) ? a : b));
          const lastChangedDate = new Date(lessonDates[lastChangedKey]);
          const startDate = new Date(lastChangedDate);
          const lastUpdate = updates.find(u => u.key === lastChangedKey);
          const afterTime = lastUpdate?.newStartTime;
          const futureDates = generateFutureInstanceDates(templateSlots, plannedAfterChanged.length, startDate, afterTime);

          const futureConflictResults = await Promise.all(
            futureDates.map((fd, i) =>
              checkTeacherConflicts(teacherUserId, fd.lessonDate, fd.startTime, fd.endTime, plannedAfterChanged[i]?.id, studentUserId)
            )
          );
          const futureConflicts = futureConflictResults.flat();
          if (futureConflicts.length > 0) setConflicts(futureConflicts);

          const updateCount = Math.min(plannedAfterChanged.length, futureDates.length);
          const remainingResults = await Promise.all(
            Array.from({ length: updateCount }, (_, i) =>
              supabase
                .from("lesson_instances")
                .update({
                  lesson_date: futureDates[i].lessonDate,
                  start_time: futureDates[i].startTime,
                  end_time: futureDates[i].endTime,
                })
                .eq("id", plannedAfterChanged[i].id)
            )
          );
          const remainingErrors = remainingResults.filter(r => r.error);
          if (remainingErrors.length > 0) {
            throw new Error(`Kalan dersler güncelleme hatası: ${remainingErrors.map(e => e.error?.message).join(', ')}`);
          }

          for (let i = 0; i < updateCount; i++) {
            finalDatesRef.current[plannedAfterChanged[i].lesson_number.toString()] = futureDates[i].lessonDate;
          }
        }
      } else if (changedKeys.length > 0) {
        await batchUpdateInstances(changedKeys, finalDatesRef);
      }

      clearWeekCache();
      await fetchInstances();
      onStudentUpdated();
      toast({ title: t("common.success"), description: t("dialogs.editStudent.datesUpdated") });

      // Non-template weekday warning
      const changedKeysForWarning = Object.keys(lessonDates).filter(
        (key) => lessonDates[key] !== originalLessonDates[key]
      );
      for (const key of changedKeysForWarning) {
        const check = await checkNonTemplateWeekday(studentUserId, teacherUserId, lessonDates[key]);
        if (check.isNonTemplate) {
          toast({
            title: t("common.info"),
            description: `${lessonDates[key]} — ${check.templateDays.join(", ")}`,
          });
          break;
        }
      }

      setShowConfirm(false);
      setUpdateRemainingDays(false);
      setConflicts([]);
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("dialogs.editStudent.datesUpdateError"), variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: t("common.error"), description: t("dialogs.editStudent.nameRequired"), variant: "destructive" });
      return;
    }

    if (!lessons.every((lesson) => lesson.dayOfWeek !== undefined && lesson.startTime && lesson.endTime)) {
      toast({ title: t("common.error"), description: t("dialogs.editStudent.scheduleRequired"), variant: "destructive" });
      return;
    }

    setLoading(true);
    setConflicts([]);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: name.trim() })
        .eq("user_id", studentUserId);
      if (profileError) throw profileError;

      const templateChanged =
        lessonsPerWeek !== currentLessons.length ||
        lessons.length !== currentLessons.length ||
        lessons.some((l, i) => {
          const curr = currentLessons[i];
          if (!curr) return true;
          return l.dayOfWeek !== curr.dayOfWeek ||
                 l.startTime !== curr.startTime ||
                 l.endTime !== curr.endTime;
        });

      if (templateChanged) {
        const slots = lessons.map((l) => ({
          dayOfWeek: l.dayOfWeek,
          startTime: l.startTime,
          endTime: l.endTime,
        }));

        const { data: rpcResult, error: rpcError } = await supabase.rpc('rpc_sync_student_schedule', {
          p_student_id: studentUserId,
          p_teacher_id: teacherUserId,
          p_slots: slots,
          p_lessons_per_week: lessonsPerWeek,
        });

        if (rpcError) throw rpcError;
        if (rpcResult && !(rpcResult as any).success) {
          throw new Error((rpcResult as any).error || 'Schedule sync failed');
        }
      } else {
        const { error: trackingError } = await supabase
          .from("student_lesson_tracking")
          .update({ lessons_per_week: lessonsPerWeek })
          .eq("student_id", studentUserId)
          .eq("teacher_id", teacherUserId);
        if (trackingError) throw trackingError;

        for (const lesson of lessons) {
          await supabase
            .from("student_lessons")
            .update({ note: lesson.note || null })
            .eq("student_id", studentUserId)
            .eq("teacher_id", teacherUserId)
            .eq("day_of_week", lesson.dayOfWeek)
            .eq("start_time", lesson.startTime);
        }
      }

      toast({ title: t("common.success"), description: t("dialogs.editStudent.updateSuccess") });
      clearWeekCache();
      onStudentUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("dialogs.editStudent.updateError"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    setLoading(true);
    try {
      const result = await deleteStudent(studentId, studentUserId, teacherUserId);
      if (!result.success) throw new Error(result.error || t("dialogs.editStudent.deleteError"));

      // Delete from auth
      const { data: sessionData } = await supabase.auth.getSession();
      await supabase.functions.invoke("delete-user", {
        body: { userId: studentUserId },
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
      });

      toast({ title: t("common.success"), description: t("dialogs.editStudent.deleteSuccess") });
      clearWeekCache();
      onStudentUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("dialogs.editStudent.deleteError"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveStudent = async () => {
    setLoading(true);
    try {
      const result = await archiveStudent(studentId, studentUserId, teacherUserId);
      if (!result.success) throw new Error(result.error || t("dialogs.editStudent.archiveError"));
      toast({ title: t("common.success"), description: t("dialogs.editStudent.archiveSuccess") });
      clearWeekCache();
      onStudentUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // Chain control helpers
  // =============================================

  const getTemplateSlots = (): TemplateSlot[] =>
    lessons.map((l) => ({ dayOfWeek: l.dayOfWeek, startTime: l.startTime, endTime: l.endTime }));

  const fetchLastCompletedAnchor = async (): Promise<{ lessonDate: string; startTime: string } | null> => {
    if (!studentUserId || !teacherUserId) return null;
    const { data } = await supabase
      .from("lesson_instances")
      .select("lesson_date, start_time")
      .eq("student_id", studentUserId)
      .eq("teacher_id", teacherUserId)
      .eq("status", "completed")
      .order("lesson_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(1);
    if (data && data.length > 0) return { lessonDate: data[0].lesson_date, startTime: data[0].start_time };
    return null;
  };

  const computeMinSlot = async () => {
    const templateSlots = getTemplateSlots();
    const anchor = await fetchLastCompletedAnchor();
    if (anchor) {
      const result = generateFutureInstanceDates(templateSlots, 1, new Date(anchor.lessonDate), anchor.startTime);
      return result[0] || null;
    }
    const result = generateFutureInstanceDates(templateSlots, 1, startOfDay(new Date()));
    return result[0] || null;
  };

  const getRealignableInstances = () =>
    [...instances]
      .filter((i) => i.status === "planned" && !i.is_manual_override)
      .sort((a, b) => {
        const dc = a.lesson_date.localeCompare(b.lesson_date);
        return dc !== 0 ? dc : a.start_time.localeCompare(b.start_time);
      });

  const resequenceLessonNumbers = async (currentInstances: LessonInstance[]) => {
    const sorted = [...currentInstances].sort((a, b) => {
      const dc = a.lesson_date.localeCompare(b.lesson_date);
      return dc !== 0 ? dc : a.start_time.localeCompare(b.start_time);
    });
    const updates = sorted
      .map((inst, idx) => ({ id: inst.id, newNum: idx + 1, oldNum: inst.lesson_number }))
      .filter((u) => u.newNum !== u.oldNum);
    if (updates.length === 0) return;
    await Promise.all(
      updates.map((u) =>
        supabase.from("lesson_instances").update({ lesson_number: u.newNum }).eq("id", u.id)
      )
    );
  };

  const handleRealignChain = async () => {
    const realignable = getRealignableInstances();
    if (realignable.length === 0) {
      toast({ title: t("common.info"), description: t("dialogs.editStudent.noRealignable", { defaultValue: "Hizalanacak planlı ders yok" }) });
      return;
    }
    setShifting(true);
    try {
      const templateSlots = getTemplateSlots();
      const anchor = await fetchLastCompletedAnchor();
      let startDate: Date;
      let afterTime: string | undefined;
      if (anchor) {
        startDate = new Date(anchor.lessonDate);
        afterTime = anchor.startTime;
      } else {
        startDate = startOfDay(new Date());
      }

      const newDates = generateFutureInstanceDates(templateSlots, realignable.length, startDate, afterTime);

      const snapshot = [...instances];
      const updatedInstances = instances.map((inst) => {
        const idx = realignable.findIndex((r) => r.id === inst.id);
        if (idx === -1 || idx >= newDates.length) return inst;
        return { ...inst, lesson_date: newDates[idx].lessonDate, start_time: newDates[idx].startTime, end_time: newDates[idx].endTime };
      });
      setInstances(updatedInstances);

      const results = await Promise.all(
        realignable.slice(0, newDates.length).map((inst, i) =>
          supabase.from("lesson_instances").update({
            lesson_date: newDates[i].lessonDate,
            start_time: newDates[i].startTime,
            end_time: newDates[i].endTime,
          }).eq("id", inst.id)
        )
      );
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        setInstances(snapshot);
        throw new Error(errors.map((e) => e.error?.message).join(", "));
      }

      await resequenceLessonNumbers(updatedInstances);
      clearWeekCache();
      onStudentUpdated();
      await fetchInstances();
      toast({ title: t("common.success"), description: t("dialogs.editStudent.realignSuccess", { defaultValue: "Ders zinciri yeniden hizalandı" }) });
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setShifting(false);
    }
  };

  const handleShiftForward = async () => {
    const realignable = getRealignableInstances();
    if (realignable.length === 0) return;
    setShifting(true);
    try {
      const templateSlots = getTemplateSlots();
      const first = realignable[0];
      const newDates = generateFutureInstanceDates(templateSlots, realignable.length, new Date(first.lesson_date), first.start_time);

      const snapshot = [...instances];
      const updatedInstances = instances.map((inst) => {
        const idx = realignable.findIndex((r) => r.id === inst.id);
        if (idx === -1 || idx >= newDates.length) return inst;
        return { ...inst, lesson_date: newDates[idx].lessonDate, start_time: newDates[idx].startTime, end_time: newDates[idx].endTime };
      });
      setInstances(updatedInstances);

      const results = await Promise.all(
        realignable.slice(0, newDates.length).map((inst, i) =>
          supabase.from("lesson_instances").update({
            lesson_date: newDates[i].lessonDate,
            start_time: newDates[i].startTime,
            end_time: newDates[i].endTime,
          }).eq("id", inst.id)
        )
      );
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        setInstances(snapshot);
        throw new Error(errors.map((e) => e.error?.message).join(", "));
      }

      await resequenceLessonNumbers(updatedInstances);
      clearWeekCache();
      onStudentUpdated();
      await fetchInstances();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setShifting(false);
    }
  };

  const handleShiftBackward = async () => {
    const realignable = getRealignableInstances();
    if (realignable.length === 0) return;
    setShifting(true);
    try {
      const templateSlots = getTemplateSlots();
      const first = realignable[0];

      const prevSlot = getSlotBefore(templateSlots, new Date(first.lesson_date), first.start_time);
      if (!prevSlot) {
        toast({ title: t("common.info"), description: t("dialogs.editStudent.cannotShiftBack", { defaultValue: "Daha geriye kaydırılamaz" }) });
        setShifting(false);
        return;
      }

      const minSlot = await computeMinSlot();
      if (minSlot) {
        const prevDateStr = format(prevSlot.date, "yyyy-MM-dd");
        if (prevDateStr < minSlot.lessonDate || (prevDateStr === minSlot.lessonDate && prevSlot.startTime < minSlot.startTime)) {
          toast({ title: t("common.info"), description: t("dialogs.editStudent.cannotShiftPastCompleted", { defaultValue: "Son işlenen dersin ötesine geri kaydırılamaz" }) });
          setShifting(false);
          return;
        }
      }

      const newDates = generateFutureInstanceDates(templateSlots, realignable.length, prevSlot.date, undefined);
      const filteredDates: typeof newDates = [];
      for (const nd of newDates) {
        if (filteredDates.length >= realignable.length) break;
        if (nd.lessonDate === format(prevSlot.date, "yyyy-MM-dd") && nd.startTime < prevSlot.startTime) continue;
        filteredDates.push(nd);
      }

      if (filteredDates.length === 0) {
        toast({ title: t("common.info"), description: t("dialogs.editStudent.cannotShiftBack", { defaultValue: "Daha geriye kaydırılamaz" }) });
        setShifting(false);
        return;
      }

      const snapshot = [...instances];
      const updatedInstances = instances.map((inst) => {
        const idx = realignable.findIndex((r) => r.id === inst.id);
        if (idx === -1 || idx >= filteredDates.length) return inst;
        return { ...inst, lesson_date: filteredDates[idx].lessonDate, start_time: filteredDates[idx].startTime, end_time: filteredDates[idx].endTime };
      });
      setInstances(updatedInstances);

      const results = await Promise.all(
        realignable.slice(0, filteredDates.length).map((inst, i) =>
          supabase.from("lesson_instances").update({
            lesson_date: filteredDates[i].lessonDate,
            start_time: filteredDates[i].startTime,
            end_time: filteredDates[i].endTime,
          }).eq("id", inst.id)
        )
      );
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        setInstances(snapshot);
        throw new Error(errors.map((e) => e.error?.message).join(", "));
      }

      await resequenceLessonNumbers(updatedInstances);
      clearWeekCache();
      onStudentUpdated();
      await fetchInstances();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setShifting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const realignable = getRealignableInstances();
      if (realignable.length === 0) { setCanShiftBackward(false); return; }
      const templateSlots = getTemplateSlots();
      const first = realignable[0];
      const prevSlot = getSlotBefore(templateSlots, new Date(first.lesson_date), first.start_time);
      if (!prevSlot) { setCanShiftBackward(false); return; }
      const minSlot = await computeMinSlot();
      if (!minSlot) { setCanShiftBackward(false); return; }
      const prevDateStr = format(prevSlot.date, "yyyy-MM-dd");
      const allowed = !(prevDateStr < minSlot.lessonDate || (prevDateStr === minSlot.lessonDate && prevSlot.startTime < minSlot.startTime));
      if (!cancelled) setCanShiftBackward(allowed);
    };
    check();
    return () => { cancelled = true; };
  }, [instances, lessons]);

  const hasRealignableInstances = getRealignableInstances().length > 0;

  // Derived state
  const completedCount = instances.filter((i) => i.status === "completed").length;
  const totalLessons = lessonsPerWeek * 4;

  const sortedLessonsForDisplay = (() => {
    const sorted = [...instances].sort((a, b) => {
      const dateCompare = a.lesson_date.localeCompare(b.lesson_date);
      if (dateCompare !== 0) return dateCompare;
      return a.start_time.localeCompare(b.start_time);
    });

    const result = sorted.map((inst, idx) => ({
      displayIndex: idx + 1,
      lessonNumber: inst.lesson_number,
      effectiveDate: inst.lesson_date,
      startTime: inst.start_time,
      endTime: inst.end_time,
      isCompleted: inst.status === "completed",
      isOverridden: inst.original_date !== null,
      instanceId: inst.id,
    }));

    for (let i = result.length; i < totalLessons; i++) {
      result.push({
        displayIndex: i + 1,
        lessonNumber: i + 1,
        effectiveDate: "",
        startTime: "",
        endTime: "",
        isCompleted: false,
        isOverridden: false,
        instanceId: undefined as any,
      });
    }

    return result;
  })();

  const handleLessonsPerWeekChange = (newCount: number) => {
    const newTotal = newCount * 4;
    if (newTotal < completedCount) {
      toast({
        title: t("common.error"),
        description: t("dialogs.editStudent.cannotReduceLessons", {
          defaultValue: `Haftalık ders sayısı ${newCount}'e düşürülemez çünkü bu döngüde zaten ${completedCount} ders tamamlanmış.`,
          count: newCount,
          completed: completedCount,
          total: newTotal,
        }),
        variant: "destructive",
      });
      return;
    }
    setLessonsPerWeek(newCount);
  };

  return {
    name, setName,
    lessonsPerWeek, lessons,
    lessonDates, originalLessonDates,
    loading, shifting, showConfirm, setShowConfirm,
    showResetConfirm, setShowResetConfirm,
    updateRemainingDays, setUpdateRemainingDays,
    conflicts, completedCount, totalLessons,
    sortedLessonsForDisplay, canShiftBackward, hasRealignableInstances,
    handleLessonsPerWeekChange, updateLesson, updateLessonDate,
    handleDateSubmit, handleMarkLastLesson, handleUndoLastLesson,
    handleResetAllLessons, confirmDateUpdate, handleSubmit,
    handleDeleteStudent, handleArchiveStudent,
    handleRealignChain, handleShiftForward, handleShiftBackward,
  };
}
