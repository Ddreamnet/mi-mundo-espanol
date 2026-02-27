import { supabase } from "@/integrations/supabase/client";
import type { ConflictInfo } from "@/types/lessonInstance";

/**
 * Pure function: check if two time ranges overlap.
 * Back-to-back (endA === startB) is NOT a conflict.
 */
export function hasTimeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB;
}

/**
 * Check a teacher's actual schedule for conflicts on a given date+time range.
 * Queries lesson_instances (planned/completed) and trial_lessons.
 * Returns an array of ConflictInfo for any overlapping entries.
 */
export async function checkTeacherConflicts(
  teacherId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeInstanceId?: string
): Promise<ConflictInfo[]> {
  const conflicts: ConflictInfo[] = [];

  // 1. Check lesson_instances for that teacher on that date
  let instanceQuery = supabase
    .from("lesson_instances")
    .select("id, student_id, lesson_date, start_time, end_time, status")
    .eq("teacher_id", teacherId)
    .eq("lesson_date", date)
    .in("status", ["planned", "completed"]);

  if (excludeInstanceId) {
    instanceQuery = instanceQuery.neq("id", excludeInstanceId);
  }

  const { data: instances } = await instanceQuery;

  if (instances && instances.length > 0) {
    // Fetch student names for conflict display
    const studentIds = [...new Set(instances.map((i) => i.student_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", studentIds);

    const nameMap = new Map(
      (profiles || []).map((p) => [p.user_id, p.full_name])
    );

    for (const inst of instances) {
      if (hasTimeOverlap(startTime, endTime, inst.start_time, inst.end_time)) {
        conflicts.push({
          studentName: nameMap.get(inst.student_id) || "Öğrenci",
          date: inst.lesson_date,
          timeRange: `${inst.start_time.slice(0, 5)} - ${inst.end_time.slice(0, 5)}`,
          type: "lesson",
          teacherId,
        });
      }
    }
  }

  // 2. Check trial_lessons for that teacher on that date
  const { data: trials } = await supabase
    .from("trial_lessons")
    .select("id, lesson_date, start_time, end_time")
    .eq("teacher_id", teacherId)
    .eq("lesson_date", date);

  if (trials) {
    for (const trial of trials) {
      if (hasTimeOverlap(startTime, endTime, trial.start_time, trial.end_time)) {
        conflicts.push({
          studentName: "Deneme Dersi",
          date: trial.lesson_date,
          timeRange: `${trial.start_time.slice(0, 5)} - ${trial.end_time.slice(0, 5)}`,
          type: "trial",
          teacherId,
        });
      }
    }
  }

  return conflicts;
}
