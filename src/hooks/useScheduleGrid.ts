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
  /** If true, fetch is triggered immediately. If false, caller must call refetch. */
  autoFetch?: boolean;
  /** Supabase realtime channel name suffix for deduplication */
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
  /** In actual mode, lessons that are instances for the current week */
  actualLessons: StudentLesson[];
}

/**
 * Shared hook for fetching and managing schedule grid data.
 * Used by both WeeklyScheduleDialog (teacher) and AdminWeeklySchedule (admin).
 * 
 * Supports two modes:
 * - "template": Shows template slots from student_lessons (default behavior)
 * - "actual": Shows actual lesson_instances for the current week
 */
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

      // Get non-archived students for this teacher
      const { data: activeStudents, error: studentsError } = await supabase
        .from("students")
        .select("student_id")
        .eq("teacher_id", teacherId)
        .eq("is_archived", false);

      if (studentsError) throw studentsError;

      const activeStudentIds = (activeStudents || []).map((s) => s.student_id);

      // Always fetch template lessons (needed for template mode and color mapping)
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

      // Fetch actual lesson instances for current week
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
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

      // Convert instances to StudentLesson format for grid rendering
      const actualFormatted: StudentLesson[] = (instancesData || []).map((inst) => {
        const instDate = new Date(inst.lesson_date + "T00:00:00");
        const dayOfWeek = instDate.getDay(); // 0=Sun
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

      // Assign colors to students
      const uniqueStudents = Array.from(new Set(formattedLessons.map((l) => l.student_id)));
      const colors: Record<string, string> = {};
      uniqueStudents.forEach((studentId, index) => {
        colors[studentId] = STUDENT_COLORS[index % STUDENT_COLORS.length];
      });
      setStudentColors(colors);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && teacherId) {
      fetchSchedule();
    }
  }, [teacherId, autoFetch, fetchSchedule]);

  // Real-time listener for trial lesson updates
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

  /** Get the date for a specific day index (0=Monday, 6=Sunday) in the current week. */
  const getDateForDayIndex = useCallback((dayIndex: number): Date => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    return addDays(weekStart, dayIndex);
  }, []);

  /** Find a trial lesson for a given day index and time slot. */
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
