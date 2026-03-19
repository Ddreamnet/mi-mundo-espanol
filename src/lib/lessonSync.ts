import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
