// Consolidated types and utility functions for lesson tracking

export interface LessonInstance {
  id: string;
  student_id: string;
  teacher_id: string;
  lesson_number: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  status: "planned" | "completed";
  original_date: string | null;
  original_start_time: string | null;
  original_end_time: string | null;
  rescheduled_count: number;
  package_cycle: number;
  created_at?: string;
  updated_at?: string;
}

export interface RowConfig {
  rows: number;
  buttonsPerRow: number;
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
 * Format a time string for display using Turkish locale.
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
 * Calculate duration in minutes between two time strings.
 */
export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

/**
 * Get day name from day_of_week number.
 */
export function getDayName(dayOfWeek: number): string {
  const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  return days[dayOfWeek] || "";
}
