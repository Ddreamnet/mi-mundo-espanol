import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, addDays, format } from "date-fns";
import type { StudentLesson, TrialLesson } from "@/types/lessons";

const STUDENT_COLORS = [
  "schedule-color-1",
  "schedule-color-2",
  "schedule-color-3",
  "schedule-color-4",
  "schedule-color-5",
  "schedule-color-6",
  "schedule-color-7",
  "schedule-color-8",
  "schedule-color-9",
  "schedule-color-10",
];

interface UseScheduleGridOptions {
  teacherId: string;
  autoFetch?: boolean;
  channelSuffix?: string;
}

interface UseScheduleGridResult {
  lessons: StudentLesson[];
  trialLessons: TrialLesson[];
  studentColors: Record<string, string>;
  loading: boolean;
  refetch: () => Promise<void>;
  getDateForDayIndex: (dayIndex: number) => Date;
  getTrialLessonForDayAndTime: (dayIndex: number, timeSlot: string) => TrialLesson | undefined;
  mode: "template" | "actual";
  setMode: (mode: "template" | "actual") => void;
  actualLessons: StudentLesson[];
}

/**
 * Lazy-generate lesson_instances for a given teacher + week.
 * Skips fully past weeks. No cap on total instance count.
 */
async function ensureInstancesForWeek(teacherId: string, ws: Date) {
  const weekStart = new Date(ws);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = addDays(weekStart, 6);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Skip fully past weeks
  if (weekEnd < today) return;

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  // 1. Get template slots for this teacher
  const { data: templates } = await supabase
    .from("student_lessons")
    .select("student_id, day_of_week, start_time, end_time")
    .eq("teacher_id", teacherId);

  if (!templates || templates.length === 0) return;

  // 2. Get active (non-archived) students
  const { data: activeStudents } = await supabase
    .from("students")
    .select("student_id")
    .eq("teacher_id", teacherId)
    .eq("is_archived", false);

  const activeIds = new Set((activeStudents || []).map((s) => s.student_id));

  // 3. Check existing instances for this week
  const { data: existingInstances } = await supabase
    .from("lesson_instances")
    .select("student_id, lesson_date")
    .eq("teacher_id", teacherId)
    .gte("lesson_date", weekStartStr)
    .lte("lesson_date", weekEndStr);

  // Build set of "student_id:lesson_date" for quick lookup
  const existingSet = new Set(
    (existingInstances || []).map((i) => `${i.student_id}:${i.lesson_date}`)
  );

  // 4. Group templates by student
  const templatesByStudent = new Map<string, typeof templates>();
  for (const t of templates) {
    if (!activeIds.has(t.student_id)) continue;
    const arr = templatesByStudent.get(t.student_id) || [];
    arr.push(t);
    templatesByStudent.set(t.student_id, arr);
  }

  // 5. Find missing students who need instances for this week
  const toInsert: any[] = [];

  // Get max lesson numbers for students that need new instances
  const studentsNeedingInstances: string[] = [];
  for (const [studentId, slots] of templatesByStudent) {
    for (const slot of slots) {
      // Calculate the date for this slot in this week
      // day_of_week: 0=Sun, 1=Mon, ..., 6=Sat
      // weekStart is Monday (weekStartsOn: 1)
      const dayOffset = slot.day_of_week === 0 ? 6 : slot.day_of_week - 1;
      const slotDate = format(addDays(weekStart, dayOffset), "yyyy-MM-dd");

      // Skip if date is before today
      if (slotDate < format(today, "yyyy-MM-dd")) continue;

      // Skip if already exists
      if (existingSet.has(`${studentId}:${slotDate}`)) continue;

      if (!studentsNeedingInstances.includes(studentId)) {
        studentsNeedingInstances.push(studentId);
      }
    }
  }

  if (studentsNeedingInstances.length === 0) return;

  // Get max lesson_number for each student needing instances
  const maxLessonMap = new Map<string, number>();
  for (const sid of studentsNeedingInstances) {
    const { data: maxData } = await supabase
      .from("lesson_instances")
      .select("lesson_number")
      .eq("student_id", sid)
      .eq("teacher_id", teacherId)
      .order("lesson_number", { ascending: false })
      .limit(1);

    maxLessonMap.set(sid, maxData && maxData.length > 0 ? maxData[0].lesson_number : 0);
  }

  // Generate instances
  for (const [studentId, slots] of templatesByStudent) {
    if (!studentsNeedingInstances.includes(studentId)) continue;
    let nextNumber = (maxLessonMap.get(studentId) || 0) + 1;

    for (const slot of slots) {
      const dayOffset = slot.day_of_week === 0 ? 6 : slot.day_of_week - 1;
      const slotDate = format(addDays(weekStart, dayOffset), "yyyy-MM-dd");

      if (slotDate < format(today, "yyyy-MM-dd")) continue;
      if (existingSet.has(`${studentId}:${slotDate}`)) continue;

      toInsert.push({
        student_id: studentId,
        teacher_id: teacherId,
        lesson_number: nextNumber++,
        lesson_date: slotDate,
        start_time: slot.start_time,
        end_time: slot.end_time,
        status: "planned",
        rescheduled_count: 0,
      });
    }
  }

  if (toInsert.length > 0) {
    await supabase.from("lesson_instances").insert(toInsert);
  }
}

export function useScheduleGrid({
  teacherId,
  autoFetch = true,
  channelSuffix = "default",
}: UseScheduleGridOptions): UseScheduleGridResult {
  const [lessons, setLessons] = useState<StudentLesson[]>([]);
  const [actualLessons, setActualLessons] = useState<StudentLesson[]>([]);
  const [trialLessons, setTrialLessons] = useState<TrialLesson[]>([]);
  const [studentColors, setStudentColors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"template" | "actual">("actual");

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);

      const { data: activeStudents, error: studentsError } = await supabase
        .from("students")
        .select("student_id")
        .eq("teacher_id", teacherId)
        .eq("is_archived", false);

      if (studentsError) throw studentsError;

      const activeStudentIds = (activeStudents || []).map((s) => s.student_id);

      // Always fetch template lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("student_lessons")
        .select("id, student_id, day_of_week, start_time, end_time, is_completed, note")
        .eq("teacher_id", teacherId)
        .in("student_id", activeStudentIds.length > 0 ? activeStudentIds : ["no-students"])
        .order("start_time", { ascending: true });

      if (lessonsError) throw lessonsError;

      // Fetch trial lessons
      const { data: trialLessonsData, error: trialLessonsError } = await supabase
        .from("trial_lessons")
        .select("id, day_of_week, start_time, end_time, is_completed")
        .eq("teacher_id", teacherId)
        .order("start_time", { ascending: true });

      if (trialLessonsError) throw trialLessonsError;
      setTrialLessons(trialLessonsData || []);

      // Fetch student names
      const studentIds = Array.from(new Set((lessonsData || []).map((l) => l.student_id)));
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", studentIds.length > 0 ? studentIds : ["no-students"]);

      if (profilesError) throw profilesError;

      const studentNameMap: Record<string, string> = {};
      (profilesData || []).forEach((profile) => {
        studentNameMap[profile.user_id] = profile.full_name;
      });

      const formattedLessons: StudentLesson[] = (lessonsData || []).map((lesson) => ({
        id: lesson.id,
        student_id: lesson.student_id,
        day_of_week: lesson.day_of_week,
        start_time: lesson.start_time,
        end_time: lesson.end_time,
        student_name: studentNameMap[lesson.student_id] || "Bilinmeyen",
        is_completed: lesson.is_completed,
        note: lesson.note,
      }));
      setLessons(formattedLessons);

      // Ensure instances exist for current week, then fetch
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      await ensureInstancesForWeek(teacherId, weekStart);

      const weekEnd = addDays(weekStart, 6);
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const weekEndStr = format(weekEnd, "yyyy-MM-dd");

      const { data: instancesData, error: instancesError } = await supabase
        .from("lesson_instances")
        .select("id, student_id, lesson_date, start_time, end_time, status, lesson_number")
        .eq("teacher_id", teacherId)
        .in("student_id", activeStudentIds.length > 0 ? activeStudentIds : ["no-students"])
        .gte("lesson_date", weekStartStr)
        .lte("lesson_date", weekEndStr)
        .in("status", ["planned", "completed"])
        .order("start_time", { ascending: true });

      if (instancesError) throw instancesError;

      // Also fetch names for any instance students not in template
      const instanceStudentIds = Array.from(
        new Set((instancesData || []).map((i) => i.student_id))
      );
      const missingNameIds = instanceStudentIds.filter((id) => !studentNameMap[id]);
      if (missingNameIds.length > 0) {
        const { data: extraProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", missingNameIds);
        (extraProfiles || []).forEach((p) => {
          studentNameMap[p.user_id] = p.full_name;
        });
      }

      const actualFormatted: StudentLesson[] = (instancesData || []).map((inst) => {
        const instDate = new Date(inst.lesson_date + "T00:00:00");
        const dayOfWeek = instDate.getDay();
        return {
          id: inst.id,
          student_id: inst.student_id,
          day_of_week: dayOfWeek,
          start_time: inst.start_time,
          end_time: inst.end_time,
          student_name: studentNameMap[inst.student_id] || "Bilinmeyen",
          is_completed: inst.status === "completed",
          note: undefined,
        };
      });
      setActualLessons(actualFormatted);

      // Assign colors
      const allStudentIds = new Set([
        ...formattedLessons.map((l) => l.student_id),
        ...actualFormatted.map((l) => l.student_id),
      ]);
      const colors: Record<string, string> = {};
      Array.from(allStudentIds).forEach((sid, index) => {
        colors[sid] = STUDENT_COLORS[index % STUDENT_COLORS.length];
      });
      setStudentColors(colors);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    if (autoFetch && teacherId) {
      fetchSchedule();
    }
  }, [teacherId, autoFetch, fetchSchedule]);

  useEffect(() => {
    if (!teacherId) return;

    const channel = supabase
      .channel(`trial-lessons-${channelSuffix}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trial_lessons",
          filter: `teacher_id=eq.${teacherId}`,
        },
        () => {
          fetchSchedule();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId, channelSuffix, fetchSchedule]);

  const getDateForDayIndex = useCallback((dayIndex: number): Date => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    return addDays(weekStart, dayIndex);
  }, []);

  const getTrialLessonForDayAndTime = useCallback(
    (dayIndex: number, timeSlot: string): TrialLesson | undefined => {
      const dbDayOfWeek = dayIndex === 6 ? 0 : dayIndex + 1;
      return trialLessons.find((l) => l.day_of_week === dbDayOfWeek && l.start_time === timeSlot);
    },
    [trialLessons]
  );

  return {
    lessons,
    trialLessons,
    studentColors,
    loading,
    refetch: fetchSchedule,
    getDateForDayIndex,
    getTrialLessonForDayAndTime,
    mode,
    setMode,
    actualLessons,
  };
}
