import type { LessonDates, LessonOverrideInfo, SortedLesson, DisplayLessonData } from "@/lib/lessonTypes";

/**
 * Build sorted lesson data with overrides applied.
 * Supports optional instanceStartTimes for time-aware sorting of same-date lessons.
 */
export function getSortedLessons(
  lessonDates: LessonDates,
  overrides: LessonOverrideInfo[],
  totalLessons: number,
  instanceStartTimes?: Record<string, string>
): SortedLesson[] {
  const lessonsWithDates: SortedLesson[] = [];

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
      isOverridden: effectiveDate !== originalDate,
    });
  }

  // Sort by effective date, then by start_time if available
  lessonsWithDates.sort((a, b) => {
    const dateA = a.isCancelled ? a.originalDate : a.effectiveDate;
    const dateB = b.isCancelled ? b.originalDate : b.effectiveDate;

    const dateCompare = dateA.localeCompare(dateB);
    if (dateCompare !== 0) return dateCompare;

    // Same date: sort by start_time if available
    if (instanceStartTimes) {
      const timeA = instanceStartTimes[a.lessonNumber.toString()] || "";
      const timeB = instanceStartTimes[b.lessonNumber.toString()] || "";
      return timeA.localeCompare(timeB);
    }

    return 0;
  });

  return lessonsWithDates;
}

/**
 * Create display data for a specific display position from sorted lessons.
 */
export function getDisplayLessonData(
  sortedLessons: SortedLesson[],
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
    isOverridden: lessonData.isOverridden,
  };
}
