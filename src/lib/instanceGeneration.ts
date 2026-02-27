import type { LessonInstance, TemplateSlot } from "@/types/lessonInstance";
import { checkTeacherConflicts } from "@/lib/conflictDetection";
import type { ConflictInfo } from "@/types/lessonInstance";
import { supabase } from "@/integrations/supabase/client";

/**
 * Get the next occurrence of a given day_of_week on or after `fromDate`.
 * dayOfWeek: 0=Sun, 1=Mon, ..., 6=Sat
 */
function getNextDateForDay(fromDate: Date, dayOfWeek: number): Date {
  const d = new Date(fromDate);
  const diff = (dayOfWeek - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 ? 0 : diff));
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * Sort template slots by day_of_week for round-robin assignment.
 */
function sortSlots(slots: TemplateSlot[]): TemplateSlot[] {
  return [...slots].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

/**
 * Generate future lesson instances from template slots.
 * Only generates for lesson numbers not already completed.
 *
 * @param templateSlots - The student's weekly template slots
 * @param existingInstances - All existing instances for this student-teacher pair
 * @param totalLessons - Total number of lessons (e.g., lessons_per_week * 4)
 * @param startFromDate - The date to start generating from
 * @returns Array of instance data (without id, for insert/upsert)
 */
export function generateFutureInstances(
  templateSlots: TemplateSlot[],
  existingInstances: LessonInstance[],
  totalLessons: number,
  startFromDate: Date
): Omit<LessonInstance, "id" | "created_at" | "updated_at">[] {
  if (templateSlots.length === 0) return [];

  const sorted = sortSlots(templateSlots);
  const completedNumbers = new Set(
    existingInstances
      .filter((i) => i.status === "completed")
      .map((i) => i.lesson_number)
  );

  const results: Omit<LessonInstance, "id" | "created_at" | "updated_at">[] = [];

  // Keep completed instances as-is
  for (const inst of existingInstances) {
    if (inst.status === "completed") {
      results.push({
        student_id: inst.student_id,
        teacher_id: inst.teacher_id,
        lesson_number: inst.lesson_number,
        lesson_date: inst.lesson_date,
        start_time: inst.start_time,
        end_time: inst.end_time,
        status: "completed",
        original_date: inst.original_date,
        original_start_time: inst.original_start_time,
        original_end_time: inst.original_end_time,
        rescheduled_count: inst.rescheduled_count,
      });
    }
  }

  // Generate planned instances for remaining lesson numbers
  let currentDate = new Date(startFromDate);
  let slotIndex = 0;

  // Find the first slot on or after startFromDate
  const firstSlotDate = getNextDateForDay(currentDate, sorted[0].dayOfWeek);
  currentDate = firstSlotDate;

  let lessonNumber = 1;
  while (lessonNumber <= totalLessons) {
    if (completedNumbers.has(lessonNumber)) {
      lessonNumber++;
      continue;
    }

    const slot = sorted[slotIndex % sorted.length];
    const nextDate = getNextDateForDay(currentDate, slot.dayOfWeek);

    results.push({
      student_id: "", // caller fills these
      teacher_id: "",
      lesson_number: lessonNumber,
      lesson_date: formatDate(nextDate),
      start_time: slot.startTime,
      end_time: slot.endTime,
      status: "planned",
      original_date: null,
      original_start_time: null,
      original_end_time: null,
      rescheduled_count: 0,
    });

    slotIndex++;
    // If we've gone through all slots this week, advance to next week
    if (slotIndex % sorted.length === 0) {
      currentDate = new Date(nextDate);
      currentDate.setDate(currentDate.getDate() + 1); // next day after last slot
    } else {
      currentDate = nextDate;
    }

    lessonNumber++;
  }

  return results;
}

/**
 * Sync template changes: keep completed instances, regenerate planned ones.
 * Runs conflict checks for each regenerated instance.
 */
export async function syncTemplateChange(
  studentId: string,
  teacherId: string,
  newSlots: TemplateSlot[],
  existingInstances: LessonInstance[],
  totalLessons: number,
  startFromDate: Date
): Promise<{ instances: Omit<LessonInstance, "id" | "created_at" | "updated_at">[]; conflicts: ConflictInfo[] }> {
  const generated = generateFutureInstances(
    newSlots,
    existingInstances,
    totalLessons,
    startFromDate
  );

  // Fill student_id and teacher_id
  for (const inst of generated) {
    inst.student_id = studentId;
    inst.teacher_id = teacherId;
  }

  // Check conflicts for planned instances only
  const allConflicts: ConflictInfo[] = [];
  const plannedInstances = generated.filter((i) => i.status === "planned");

  for (const inst of plannedInstances) {
    const conflicts = await checkTeacherConflicts(
      teacherId,
      inst.lesson_date,
      inst.start_time,
      inst.end_time
    );
    // Filter out self-conflicts (same student)
    const externalConflicts = conflicts.filter(
      (c) => c.studentName !== "Deneme Dersi" || c.type === "trial"
    );
    allConflicts.push(...externalConflicts);
  }

  return { instances: generated, conflicts: allConflicts };
}

/**
 * Bulk upsert lesson instances into the database.
 */
export async function upsertLessonInstances(
  instances: Omit<LessonInstance, "id" | "created_at" | "updated_at">[]
): Promise<void> {
  if (instances.length === 0) return;

  // Delete existing planned instances for this student-teacher pair, then insert all
  const studentId = instances[0].student_id;
  const teacherId = instances[0].teacher_id;

  // Only delete planned ones (keep completed)
  await supabase
    .from("lesson_instances")
    .delete()
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId)
    .eq("status", "planned");

  // Insert all (completed ones already exist, so use upsert)
  const toInsert = instances.filter((i) => i.status === "planned");
  if (toInsert.length > 0) {
    await supabase.from("lesson_instances").insert(
      toInsert.map((i) => ({
        student_id: i.student_id,
        teacher_id: i.teacher_id,
        lesson_number: i.lesson_number,
        lesson_date: i.lesson_date,
        start_time: i.start_time,
        end_time: i.end_time,
        status: i.status,
        original_date: i.original_date,
        original_start_time: i.original_start_time,
        original_end_time: i.original_end_time,
        rescheduled_count: i.rescheduled_count,
      }))
    );
  }
}
