import { supabase } from "@/integrations/supabase/client";
import { calculateLessonDuration } from "@/utils/lessonDateUtils";

interface LessonWithTimes {
  start_time: string;
  end_time: string;
}

/**
 * Add a completed regular lesson to the teacher's balance.
 * Fetches lesson duration from the student's schedule.
 */
export async function addRegularLessonToBalance(
  teacherId: string,
  studentId: string
): Promise<void> {
  try {
    const { data: lessonData } = await supabase
      .from("student_lessons")
      .select("start_time, end_time")
      .eq("student_id", studentId)
      .eq("teacher_id", teacherId)
      .limit(1)
      .single();

    if (!lessonData) return;

    const durationMinutes = calculateLessonDuration(lessonData.start_time, lessonData.end_time);

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
    console.error("Error updating teacher balance (regular):", error);
  }
}

/**
 * Add a completed trial lesson to the teacher's balance.
 */
export async function addTrialLessonToBalance(
  teacherId: string,
  lesson: LessonWithTimes
): Promise<void> {
  try {
    const durationMinutes = calculateLessonDuration(lesson.start_time, lesson.end_time);

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
          completed_trial_lessons: existingBalance.completed_trial_lessons + 1,
          trial_lessons_minutes: existingBalance.trial_lessons_minutes + durationMinutes,
        })
        .eq("teacher_id", teacherId);
    } else {
      await supabase.from("teacher_balance").insert({
        teacher_id: teacherId,
        total_minutes: durationMinutes,
        completed_regular_lessons: 0,
        completed_trial_lessons: 1,
        regular_lessons_minutes: 0,
        trial_lessons_minutes: durationMinutes,
      });
    }
  } catch (error) {
    console.error("Error updating teacher balance (trial):", error);
  }
}

/**
 * Subtract a trial lesson from the teacher's balance (undo completion).
 */
export async function subtractTrialLessonFromBalance(
  teacherId: string,
  lesson: LessonWithTimes
): Promise<void> {
  try {
    const durationMinutes = calculateLessonDuration(lesson.start_time, lesson.end_time);

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
          completed_trial_lessons: Math.max(0, existingBalance.completed_trial_lessons - 1),
          trial_lessons_minutes: Math.max(0, existingBalance.trial_lessons_minutes - durationMinutes),
        })
        .eq("teacher_id", teacherId);
    }
  } catch (error) {
    console.error("Error subtracting from teacher balance:", error);
  }
}

/**
 * Add a completed regular lesson to balance using lesson_instances data.
 * Reads start_time/end_time directly from the instance row.
 */
export async function addRegularLessonToBalanceFromInstance(
  teacherId: string,
  instanceId: string
): Promise<void> {
  try {
    const { data: instance } = await supabase
      .from("lesson_instances")
      .select("start_time, end_time")
      .eq("id", instanceId)
      .single();

    if (!instance) return;

    const durationMinutes = calculateLessonDuration(instance.start_time, instance.end_time);

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
    console.error("Error updating teacher balance from instance:", error);
  }
}

/**
 * Subtract a regular lesson from balance using lesson_instances data.
 */
export async function subtractRegularLessonFromBalanceByInstance(
  teacherId: string,
  instanceId: string
): Promise<void> {
  try {
    const { data: instance } = await supabase
      .from("lesson_instances")
      .select("start_time, end_time")
      .eq("id", instanceId)
      .single();

    if (!instance) return;

    const durationMinutes = calculateLessonDuration(instance.start_time, instance.end_time);

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
    console.error("Error subtracting from teacher balance by instance:", error);
  }
}
