import { format, addDays } from "date-fns";
import type {
  LessonDates,
  LessonOverrideBasic,
  SortedLessonData,
  DisplayLessonData,
  RowConfig,
} from "@/types/lessons";

/**
 * Build sorted lesson data with overrides applied.
 * Lessons are sorted by effective date (chronological order).
 */
export function getSortedLessons(
  lessonDates: LessonDates,
  overrides: LessonOverrideBasic[],
  totalLessons: number
): SortedLessonData[] {
  const lessonsWithDates: SortedLessonData[] = [];

  for (let i = 1; i <= totalLessons; i++) {
    const originalDate = lessonDates[i.toString()];
    if (!originalDate) continue;

    const override = overrides.find((o) => o.original_date === originalDate);
    const isCancelled = override?.is_cancelled || false;
    const effectiveDate =
      override && override.new_date && !isCancelled
        ? override.new_date
        : originalDate;

    lessonsWithDates.push({
      lessonNumber: i,
      originalDate,
      effectiveDate,
      isCancelled,
    });
  }

  // Sort by effective date (chronological order)
  lessonsWithDates.sort((a, b) => {
    if (a.isCancelled && b.isCancelled)
      return a.originalDate.localeCompare(b.originalDate);
    if (a.isCancelled)
      return a.originalDate.localeCompare(b.effectiveDate);
    if (b.isCancelled)
      return a.effectiveDate.localeCompare(b.originalDate);
    return a.effectiveDate.localeCompare(b.effectiveDate);
  });

  return lessonsWithDates;
}

/**
 * Create display data for a specific display position from sorted lessons.
 */
export function getDisplayLessonData(
  sortedLessons: SortedLessonData[],
  lessonDates: LessonDates,
  displayPosition: number
): DisplayLessonData {
  if (Object.keys(lessonDates).length === 0) {
    return {
      lessonNumber: displayPosition,
      displayDate: null,
      isCancelled: false,
      isOverridden: false,
    };
  }

  const lessonData = sortedLessons[displayPosition - 1];
  if (!lessonData) {
    return {
      lessonNumber: displayPosition,
      displayDate: null,
      isCancelled: false,
      isOverridden: false,
    };
  }

  return {
    lessonNumber: lessonData.lessonNumber,
    displayDate: lessonData.effectiveDate,
    isCancelled: lessonData.isCancelled,
    isOverridden: lessonData.effectiveDate !== lessonData.originalDate,
  };
}

/**
 * Get row/column layout configuration based on lessons per week.
 */
export function getRowConfig(lessonsPerWeek: number): RowConfig {
  if (lessonsPerWeek === 1) return { rows: 1, buttonsPerRow: 4 };
  if (lessonsPerWeek === 2) return { rows: 2, buttonsPerRow: 4 };
  return { rows: 2, buttonsPerRow: 6 };
}

/**
 * Calculate all lesson dates based on a marked lesson number and its date,
 * using the student's weekly lesson days.
 */
export function calculateLessonDates(
  markedLessonNumber: number,
  markedDate: Date,
  studentLessonDays: number[]
): LessonDates {
  if (studentLessonDays.length === 0) return {};

  const dates: LessonDates = {};
  const totalLessons = studentLessonDays.length * 4; // 4 weeks

  // Set the marked lesson's date
  dates[markedLessonNumber.toString()] = format(markedDate, "yyyy-MM-dd");

  // Calculate dates for lessons BEFORE the marked lesson (going backwards)
  let currentDate = new Date(markedDate);
  currentDate.setHours(0, 0, 0, 0);

  for (let lessonCount = markedLessonNumber - 1; lessonCount >= 1; lessonCount--) {
    let daysToSubtract = 1;
    let prevDate = addDays(currentDate, -daysToSubtract);

    while (!studentLessonDays.includes(prevDate.getDay())) {
      daysToSubtract++;
      prevDate = addDays(currentDate, -daysToSubtract);
    }

    currentDate = prevDate;
    dates[lessonCount.toString()] = format(currentDate, "yyyy-MM-dd");
  }

  // Calculate dates for lessons AFTER the marked lesson (going forwards)
  currentDate = new Date(markedDate);
  currentDate.setHours(0, 0, 0, 0);

  for (let lessonCount = markedLessonNumber + 1; lessonCount <= totalLessons; lessonCount++) {
    let daysToAdd = 1;
    let nextDate = addDays(currentDate, daysToAdd);

    while (!studentLessonDays.includes(nextDate.getDay())) {
      daysToAdd++;
      nextDate = addDays(currentDate, daysToAdd);
    }

    currentDate = nextDate;
    dates[lessonCount.toString()] = format(currentDate, "yyyy-MM-dd");
  }

  return dates;
}

/**
 * Format a time string for display.
 */
export function formatTime(time: string, locale: string = "tr-TR"): string {
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return time;
  }
}

/**
 * Calculate lesson duration in minutes from start/end time strings.
 */
export function calculateLessonDuration(startTime: string, endTime: string): number {
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  return Math.round((end.getTime() - start.getTime()) / 60000);
}
