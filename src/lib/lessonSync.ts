import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Rebuild legacy lesson_dates JSON from lesson_instances.
 * Keeps student_lesson_tracking.lesson_dates in sync as a safety net.
 */
export async function rebuildLegacyLessonDatesFromInstances(
  studentId: string,
  teacherId: string
): Promise<Record<string, string>> {
  const { data: instances } = await supabase
    .from("lesson_instances")
    .select("lesson_number, lesson_date, status")
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId)
    .in("status", ["planned", "completed"])
    .order("lesson_number", { ascending: true });

  const lessonDates: Record<string, string> = {};
  if (instances) {
    for (const inst of instances) {
      lessonDates[inst.lesson_number.toString()] = inst.lesson_date;
    }
  }

  // Update student_lesson_tracking
  const { data: records } = await supabase
    .from("student_lesson_tracking")
    .select("id")
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (records && records.length > 0) {
    await supabase
      .from("student_lesson_tracking")
      .update({ lesson_dates: lessonDates })
      .eq("id", records[0].id);
  }

  return lessonDates;
}

/**
 * Check if a date falls on a non-template weekday and show info toast.
 */
export async function checkNonTemplateWeekday(
  studentId: string,
  teacherId: string,
  dateStr: string
): Promise<boolean> {
  const { data: templateSlots } = await supabase
    .from("student_lessons")
    .select("day_of_week")
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId);

  if (!templateSlots || templateSlots.length === 0) return false;

  const templateDays = templateSlots.map((s) => s.day_of_week);
  const date = new Date(dateStr + "T00:00:00");
  const dayOfWeek = date.getDay();

  if (!templateDays.includes(dayOfWeek)) {
    const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    toast.info(
      `Bu tarih (${dayNames[dayOfWeek]}) öğrencinin normal ders günlerinden biri değil. Yine de kaydedildi.`
    );
    return true;
  }

  return false;
}
