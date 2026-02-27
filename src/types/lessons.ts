// Shared types for lesson tracking, scheduling, and override flows

export interface LessonDates {
  [key: string]: string;
}

export interface LessonOverrideBasic {
  id: string;
  original_date: string;
  new_date: string | null;
  is_cancelled: boolean;
}

export interface StudentLesson {
  id: string;
  student_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  student_name: string;
  is_completed: boolean;
  note?: string;
}

export interface TrialLesson {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_completed: boolean;
}

export interface SortedLessonData {
  lessonNumber: number;
  originalDate: string;
  effectiveDate: string;
  isCancelled: boolean;
}

export interface DisplayLessonData {
  lessonNumber: number;
  displayDate: string | null;
  isCancelled: boolean;
  isOverridden: boolean;
}

export interface RowConfig {
  rows: number;
  buttonsPerRow: number;
}
