import { supabase } from "@/integrations/supabase/client";
import { checkTeacherConflicts, checkTeacherConflictsBatch } from "@/lib/conflictDetection";
import type { ConflictInfo } from "@/lib/conflictDetection";

export interface TemplateSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface GeneratedDate {
  lessonDate: string;
  startTime: string;
  endTime: string;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * Get the next date that matches any of the template slots, starting from `fromDate`.
 */
function getNextDateForSlots(
  fromDate: Date,
  slots: TemplateSlot[]
): { date: Date; slot: TemplateSlot } | null {
  const sortedSlots = [...slots].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  for (let offset = 0; offset < 14; offset++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + offset);
    const dow = d.getDay();

    const matchingSlot = sortedSlots.find((s) => s.dayOfWeek === dow);
    if (matchingSlot) {
      return { date: d, slot: matchingSlot };
    }
  }

  return null;
}

/**
 * Generate future instance dates from template slots.
 * Returns array of { lessonDate, startTime, endTime }.
 */
export function generateFutureInstanceDates(
  templateSlots: TemplateSlot[],
  count: number,
  startFromDate: Date
): GeneratedDate[] {
  if (templateSlots.length === 0 || count <= 0) return [];

  const results: GeneratedDate[] = [];
  let currentDate = new Date(startFromDate);
  currentDate.setHours(0, 0, 0, 0);

  while (results.length < count) {
    const match = getNextDateForSlots(currentDate, templateSlots);
    if (!match) break;

    results.push({
      lessonDate: formatDate(match.date),
      startTime: match.slot.startTime,
      endTime: match.slot.endTime,
    });

    // Move to next day to avoid picking same date again
    currentDate = new Date(match.date);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return results;
}

/**
 * Sync template changes: keep completed instances, regenerate planned ones.
 * Cycle-aware: only operates on current package_cycle instances.
 */
export async function syncTemplateChange(
  studentId: string,
  teacherId: string,
  newSlots: TemplateSlot[],
  totalLessons: number
): Promise<{ conflicts: ConflictInfo[]; success: boolean }> {
  // 0. Get current cycle
  const { data: tracking } = await supabase
    .from("student_lesson_tracking")
    .select("package_cycle")
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  const currentCycle = (tracking as any)?.package_cycle ?? 1;

  // 1. Get existing instances in current cycle
  const { data: existing } = await supabase
    .from("lesson_instances")
    .select("*")
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId)
    .eq("package_cycle", currentCycle)
    .order("lesson_number", { ascending: true });

  const allInstances = existing || [];
  const completed = allInstances.filter((i) => i.status === "completed");
  const maxCompletedNumber = completed.length > 0
    ? Math.max(...completed.map((i) => i.lesson_number))
    : 0;

  // 2. Delete only planned instances in current cycle
  await supabase
    .from("lesson_instances")
    .delete()
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId)
    .eq("status", "planned")
    .eq("package_cycle", currentCycle);

  // 3. Generate new planned instances from template
  const remainingCount = totalLessons - maxCompletedNumber;
  if (remainingCount <= 0) return { conflicts: [], success: true };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const generated = generateFutureInstanceDates(newSlots, remainingCount, today);

  // 4. Check conflicts
  const conflicts = await checkTeacherConflictsBatch(
    teacherId,
    generated,
    studentId
  );

  if (conflicts.length > 0) {
    return { conflicts, success: false };
  }

  // 5. Insert new planned instances with cycle
  const toInsert = generated.map((g, idx) => ({
    student_id: studentId,
    teacher_id: teacherId,
    lesson_number: maxCompletedNumber + idx + 1,
    lesson_date: g.lessonDate,
    start_time: g.startTime,
    end_time: g.endTime,
    status: "planned" as const,
    rescheduled_count: 0,
    package_cycle: currentCycle,
  }));

  if (toInsert.length > 0) {
    await supabase.from("lesson_instances").insert(toInsert);
  }

  return { conflicts: [], success: true };
}

/**
 * "Sonraki Derse Aktar" — shift target + subsequent planned instances forward by one slot.
 * Cycle-aware: only shifts planned instances in current cycle.
 */
export async function shiftLessonsForward(
  studentId: string,
  teacherId: string,
  fromInstanceId: string,
  templateSlots: TemplateSlot[]
): Promise<{ conflicts: ConflictInfo[]; success: boolean }> {
  // 0. Get current cycle
  const { data: tracking } = await supabase
    .from("student_lesson_tracking")
    .select("package_cycle")
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  const currentCycle = (tracking as any)?.package_cycle ?? 1;

  // 1. Get target instance
  const { data: target } = await supabase
    .from("lesson_instances")
    .select("*")
    .eq("id", fromInstanceId)
    .single();

  if (!target) return { conflicts: [], success: false };

  // 2. Get all planned instances from this one forward in current cycle
  const { data: planned } = await supabase
    .from("lesson_instances")
    .select("*")
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId)
    .eq("status", "planned")
    .eq("package_cycle", currentCycle)
    .gte("lesson_number", target.lesson_number)
    .order("lesson_number", { ascending: true });

  if (!planned || planned.length === 0) return { conflicts: [], success: false };

  // 3. Generate new dates for shifted instances
  const startDate = new Date(target.lesson_date + "T00:00:00");
  startDate.setDate(startDate.getDate() + 1); // Start from day after current

  const newDates = generateFutureInstanceDates(templateSlots, planned.length, startDate);

  if (newDates.length < planned.length) {
    return { conflicts: [], success: false };
  }

  // 4. Check conflicts
  const conflicts = await checkTeacherConflictsBatch(
    teacherId,
    newDates,
    studentId
  );

  if (conflicts.length > 0) {
    return { conflicts, success: false };
  }

  // 5. Update each instance in-place
  for (let i = 0; i < planned.length; i++) {
    const inst = planned[i];
    const newDate = newDates[i];

    await supabase
      .from("lesson_instances")
      .update({
        lesson_date: newDate.lessonDate,
        start_time: newDate.startTime,
        end_time: newDate.endTime,
        original_date: inst.original_date || inst.lesson_date,
        original_start_time: inst.original_start_time || inst.start_time,
        original_end_time: inst.original_end_time || inst.end_time,
        rescheduled_count: (inst.rescheduled_count || 0) + 1,
      })
      .eq("id", inst.id);
  }

  return { conflicts: [], success: true };
}
