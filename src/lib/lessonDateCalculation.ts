import { format, addDays, parse } from "date-fns";
import type { LessonDates } from "@/lib/lessonTypes";

/**
 * Calculate all lesson dates based on a marked lesson number and its date,
 * using the student's weekly lesson days.
 */
export function calculateLessonDates(
  markedLessonNumber: number,
  markedDate: Date,
  studentLessonDays: number[],
  totalLessons: number
): LessonDates {
  if (studentLessonDays.length === 0) return {};

  const dates: LessonDates = {};

  dates[markedLessonNumber.toString()] = format(markedDate, "yyyy-MM-dd");

  // Calculate dates BEFORE the marked lesson (going backwards)
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

  // Calculate dates AFTER the marked lesson (going forwards)
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
 * Recalculate remaining dates from a specific lesson number forward.
 */
export function recalculateRemainingDates(
  fromLessonNumber: number,
  startDate: string,
  currentDates: LessonDates,
  lessonDays: number[],
  totalLessons: number
): LessonDates {
  const newDates = { ...currentDates };
  newDates[fromLessonNumber.toString()] = startDate;

  let currentDateObj = parse(startDate, "yyyy-MM-dd", new Date());
  currentDateObj.setHours(0, 0, 0, 0);

  // Recalculate forward
  for (let i = fromLessonNumber + 1; i <= totalLessons; i++) {
    let daysToAdd = 1;
    let nextDate = addDays(currentDateObj, daysToAdd);

    while (!lessonDays.includes(nextDate.getDay())) {
      daysToAdd++;
      nextDate = addDays(currentDateObj, daysToAdd);
    }

    currentDateObj = nextDate;
    newDates[i.toString()] = format(currentDateObj, "yyyy-MM-dd");
  }

  return newDates;
}

/**
 * Calculate the next lesson date from a given date based on lesson days.
 */
export function calculateNextLessonDate(currentDate: Date, lessonDays: number[]): Date {
  let nextDate = addDays(currentDate, 1);
  let attempts = 0;
  while (!lessonDays.includes(nextDate.getDay()) && attempts < 14) {
    nextDate = addDays(nextDate, 1);
    attempts++;
  }
  return nextDate;
}
