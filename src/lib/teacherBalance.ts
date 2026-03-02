import { supabase } from "@/integrations/supabase/client";
import { calculateDurationMinutes } from "@/lib/lessonTypes";

interface BalanceUpdateParams {
  teacherId: string;
  lessonType: "regular" | "trial";
  startTime: string;
  endTime: string;
}

/**
 * Add a completed lesson to the teacher's balance.
 */
export async function addToTeacherBalance({
  teacherId,
  lessonType,
  startTime,
  endTime,
}: BalanceUpdateParams): Promise<void> {
  try {
    const durationMinutes = calculateDurationMinutes(startTime, endTime);

    const { data: existingBalance } = await supabase
      .from("teacher_balance")
      .select("*")
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (existingBalance) {
      const update: Record<string, number> = {
        total_minutes: existingBalance.total_minutes + durationMinutes,
      };
      if (lessonType === "regular") {
        update.completed_regular_lessons = existingBalance.completed_regular_lessons + 1;
        update.regular_lessons_minutes = existingBalance.regular_lessons_minutes + durationMinutes;
      } else {
        update.completed_trial_lessons = existingBalance.completed_trial_lessons + 1;
        update.trial_lessons_minutes = existingBalance.trial_lessons_minutes + durationMinutes;
      }
      await supabase.from("teacher_balance").update(update).eq("teacher_id", teacherId);
    } else {
      await supabase.from("teacher_balance").insert({
        teacher_id: teacherId,
        total_minutes: durationMinutes,
        completed_regular_lessons: lessonType === "regular" ? 1 : 0,
        completed_trial_lessons: lessonType === "trial" ? 1 : 0,
        regular_lessons_minutes: lessonType === "regular" ? durationMinutes : 0,
        trial_lessons_minutes: lessonType === "trial" ? durationMinutes : 0,
      });
    }
  } catch (error) {
    console.error("Error updating teacher balance:", error);
  }
}

/**
 * Subtract a lesson from the teacher's balance (undo).
 */
export async function subtractFromTeacherBalance({
  teacherId,
  lessonType,
  startTime,
  endTime,
}: BalanceUpdateParams): Promise<void> {
  try {
    const durationMinutes = calculateDurationMinutes(startTime, endTime);

    const { data: existingBalance } = await supabase
      .from("teacher_balance")
      .select("*")
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (existingBalance) {
      const update: Record<string, number> = {
        total_minutes: Math.max(0, existingBalance.total_minutes - durationMinutes),
      };
      if (lessonType === "regular") {
        update.completed_regular_lessons = Math.max(0, existingBalance.completed_regular_lessons - 1);
        update.regular_lessons_minutes = Math.max(0, existingBalance.regular_lessons_minutes - durationMinutes);
      } else {
        update.completed_trial_lessons = Math.max(0, existingBalance.completed_trial_lessons - 1);
        update.trial_lessons_minutes = Math.max(0, existingBalance.trial_lessons_minutes - durationMinutes);
      }
      await supabase.from("teacher_balance").update(update).eq("teacher_id", teacherId);
    }
  } catch (error) {
    console.error("Error subtracting from teacher balance:", error);
  }
}

/**
 * Instance-aware: add regular lesson balance using instance times.
 */
export async function addRegularLessonBalance(
  teacherId: string,
  studentId: string,
  instanceId?: string
): Promise<void> {
  let startTime: string;
  let endTime: string;

  if (instanceId) {
    const { data: instance } = await supabase
      .from("lesson_instances")
      .select("start_time, end_time")
      .eq("id", instanceId)
      .single();

    if (!instance) return;
    startTime = instance.start_time;
    endTime = instance.end_time;
  } else {
    const { data: lessonData } = await supabase
      .from("student_lessons")
      .select("start_time, end_time")
      .eq("student_id", studentId)
      .eq("teacher_id", teacherId)
      .limit(1)
      .single();

    if (!lessonData) return;
    startTime = lessonData.start_time;
    endTime = lessonData.end_time;
  }

  await addToTeacherBalance({ teacherId, lessonType: "regular", startTime, endTime });
}

/**
 * Instance-aware: subtract regular lesson balance using instance times.
 */
export async function subtractRegularLessonBalance(
  teacherId: string,
  studentId: string,
  instanceId?: string
): Promise<void> {
  let startTime: string;
  let endTime: string;

  if (instanceId) {
    const { data: instance } = await supabase
      .from("lesson_instances")
      .select("start_time, end_time")
      .eq("id", instanceId)
      .single();

    if (!instance) return;
    startTime = instance.start_time;
    endTime = instance.end_time;
  } else {
    const { data: lessonData } = await supabase
      .from("student_lessons")
      .select("start_time, end_time")
      .eq("student_id", studentId)
      .eq("teacher_id", teacherId)
      .limit(1)
      .single();

    if (!lessonData) return;
    startTime = lessonData.start_time;
    endTime = lessonData.end_time;
  }

  await subtractFromTeacherBalance({ teacherId, lessonType: "regular", startTime, endTime });
}

// Re-export old names for backward compatibility with trial lesson flows
export async function addTrialLessonToBalance(
  teacherId: string,
  lesson: { start_time: string; end_time: string }
): Promise<void> {
  await addToTeacherBalance({
    teacherId,
    lessonType: "trial",
    startTime: lesson.start_time,
    endTime: lesson.end_time,
  });
}

export async function subtractTrialLessonFromBalance(
  teacherId: string,
  lesson: { start_time: string; end_time: string }
): Promise<void> {
  await subtractFromTeacherBalance({
    teacherId,
    lessonType: "trial",
    startTime: lesson.start_time,
    endTime: lesson.end_time,
  });
}
