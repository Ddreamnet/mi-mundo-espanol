// Compatibility shim — delegates to new modular files
// Keep getLocale here as it's locale-specific and not moved elsewhere

export { getRowConfig, formatTime, calculateDurationMinutes as calculateLessonDuration } from "@/lib/lessonTypes";
export { calculateLessonDates } from "@/lib/lessonDateCalculation";

/**
 * Get the locale string for time/date formatting based on language code.
 */
export function getLocale(language: string): string {
  switch (language) {
    case "tr": return "tr-TR";
    case "es": return "es-ES";
    case "en": return "en-US";
    default: return "tr-TR";
  }
}
