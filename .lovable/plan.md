
# Refactoring Plan: Lesson Tracking, Schedule, and Override Flows (UPDATED)

## Existing Functionality Summary

### Files in Scope

| File | Lines | Role |
|------|-------|------|
| `src/components/LessonTracker.tsx` | 495 | Teacher view: mark lessons complete, show dates with overrides |
| `src/components/StudentLessonTracker.tsx` | 274 | Student view: read-only lesson progress with realtime updates |
| `src/components/LessonOverrideDialog.tsx` | 585 | Dialog for postpone/reschedule/revert lesson dates |
| `src/components/WeeklyScheduleDialog.tsx` | ~486 | Teacher weekly schedule (dialog) with override display |
| `src/components/AdminWeeklySchedule.tsx` | 808 | Admin weekly schedule (inline card) with override + trial lesson management |
| `src/hooks/useLessonOverrides.ts` | ~120 | Hook for fetching/querying overrides |
| `src/components/EditStudentLessonsDialog.tsx` | 308 | Edit student lesson schedule (drag-and-drop) |
| `src/components/EditStudentScheduleDialog.tsx` | 183 | Legacy single-lesson schedule editor |

### Key Duplication Identified

**1. Shared Types (duplicated 4x)**
`LessonDates`, `LessonOverride`, `StudentLesson`, `TrialLesson` interfaces are redefined in every file.

**2. `getSortedLessons` + `getDisplayLessonData` (duplicated 2x)**
Identical ~60 lines in both `LessonTracker` and `StudentLessonTracker`.

**3. `getRowConfig` (duplicated 2x)**
Same row/column layout logic in both tracker components.

**4. Teacher Balance Update/Subtract (duplicated 3x)**
`updateTeacherBalance` and `subtractFromTeacherBalance` are copy-pasted across `LessonTracker`, `WeeklyScheduleDialog`, and `AdminWeeklySchedule` (~40 lines each).

**5. Schedule Grid Logic (duplicated 2x)**
`getAllTimeSlots`, `getLessonForDayAndTime`, `getTrialLessonForDayAndTime`, `getDateForDayIndex` are near-identical between `WeeklyScheduleDialog` and `AdminWeeklySchedule`.

**6. Schedule Fetching (duplicated 2x)**
`fetchSchedule` with active student filtering, profile joining, and color assignment -- same logic in both schedule components.

**7. Inline Override Fetching (duplicated 2x)**
`LessonTracker` and `StudentLessonTracker` both fetch overrides inline instead of using the existing `useLessonOverrides` hook.

---

## Refactoring Plan

### Phase 1: Extract Shared Types and Utilities

**New file: `src/types/lessons.ts`**
- Move all shared interfaces: `LessonDates`, `LessonOverride`, `StudentLesson`, `TrialLesson`, `StudentSchedule`
- Single source of truth; all components import from here

**New file: `src/utils/lessonDateUtils.ts`**
- Extract `getSortedLessons(lessonDates, overrides, totalLessons)` 
- Extract `getDisplayLessonData(sortedLessons, lessonDates, displayPosition)`
- Extract `getRowConfig(lessonsPerWeek)`
- Extract `calculateLessonDates(markedLesson, markedDate, studentLessonDays)`
- Extract `formatTime(time, locale)`

### Phase 2: Extract Teacher Balance Service

**New file: `src/services/teacherBalanceService.ts`**
- `updateTeacherBalance(teacherId, lesson)` -- handles both regular and trial lessons
- `subtractFromTeacherBalance(teacherId, lesson)`
- `calculateLessonDuration(startTime, endTime)` helper
- Removes ~80 lines of duplication across 3 files

### Phase 3: Extract Schedule Grid Logic

**New file: `src/hooks/useScheduleGrid.ts`**
- Custom hook combining: `fetchSchedule`, `getAllTimeSlots`, `getLessonForDayAndTime`, `getTrialLessonForDayAndTime`, `getDateForDayIndex`
- Accepts `teacherId` and optional config (e.g., `showCancelledLessons` for admin)
- Returns `{ lessons, trialLessons, studentColors, timeSlots, getLessonForDayAndTime, getTrialLessonForDayAndTime, loading, refetch }`
- `WeeklyScheduleDialog` and `AdminWeeklySchedule` both consume this hook

### Phase 4: Unify LessonTracker Components

**Refactor `LessonTracker.tsx` and `StudentLessonTracker.tsx`:**
- `LessonTracker` becomes the single component with a `readOnly` prop
- When `readOnly=true`: no click handlers, no confirmation dialog, shows progress stats (student view)
- When `readOnly=false`: click to mark complete, confirmation dialog (teacher view)
- Uses `useLessonOverrides` hook instead of inline fetching
- Imports all date/display logic from `lessonDateUtils.ts`
- `StudentLessonTracker` becomes a thin wrapper: `<LessonTracker readOnly studentId={...} />`

### Phase 5: Refactor Override Fetching

- `LessonTracker` and `StudentLessonTracker` currently fetch overrides independently
- Replace with `useLessonOverrides` hook (already exists but unused in these components)
- Remove duplicate `fetchLessonOverrides` functions

---

## Files Changed (Summary)

| Action | File | Why |
|--------|------|-----|
| Create | `src/types/lessons.ts` | Centralize shared interfaces |
| Create | `src/utils/lessonDateUtils.ts` | Extract duplicated date/display logic |
| Create | `src/services/teacherBalanceService.ts` | Extract duplicated balance logic |
| Create | `src/hooks/useScheduleGrid.ts` | Extract duplicated schedule grid logic |
| Modify | `src/components/LessonTracker.tsx` | Add `readOnly` prop, use shared utils/hooks |
| Modify | `src/components/StudentLessonTracker.tsx` | Thin wrapper around unified LessonTracker |
| Modify | `src/components/WeeklyScheduleDialog.tsx` | Use `useScheduleGrid` hook and shared utils |
| Modify | `src/components/AdminWeeklySchedule.tsx` | Use `useScheduleGrid` hook and shared utils |
| Modify | `src/components/LessonOverrideDialog.tsx` | Import types from shared module |
| Modify | `src/hooks/useLessonOverrides.ts` | Import types from shared module |
| No change | `src/components/EditStudentLessonsDialog.tsx` | Already clean, no duplication |
| No change | `src/components/EditStudentScheduleDialog.tsx` | Separate concern, no overlap |

---

## Estimated Impact

- ~300 lines of duplicated code eliminated
- 4 duplicate interface definitions consolidated to 1
- 3 duplicate balance update functions consolidated to 1
- 2 duplicate schedule grid implementations consolidated to 1
- 2 duplicate lesson display renderers consolidated to 1

## Risk Mitigation

- Each phase is independently deployable; if one breaks, it can be reverted without affecting others
- No UI or behavior changes -- purely structural
- Existing `useLessonOverrides` hook is already tested in production
- Will verify each component renders identically after refactoring by testing in preview
