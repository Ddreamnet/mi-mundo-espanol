

# Audit Report: EWD Revival Sync Compliance

## Summary

All 10 files from the spec exist and are functionally aligned. There are a few minor gaps and one orphaned file to clean up.

---

## File-by-File Compliance

### 1. `src/lib/lessonTypes.ts` — PASS
All interfaces (`LessonDates`, `LessonOverrideInfo`, `SortedLesson`, `DisplayLessonData`, `LessonInstance`, `RowConfig`) and helpers (`getRowConfig`, `formatTime`, `calculateDurationMinutes`, `getDayName`) match the spec exactly.

### 2. `src/lib/lessonSorting.ts` — PASS
`getSortedLessons` accepts optional `instanceStartTimes` for time-aware sorting. `getDisplayLessonData` handles empty `lessonDates` correctly.

### 3. `src/lib/lessonDateCalculation.ts` — PASS
`calculateLessonDates`, `recalculateRemainingDates`, `calculateNextLessonDate` all present and match spec.

### 4. `src/lib/lessonSync.ts` — PASS
`rebuildLegacyLessonDatesFromInstances` and `checkNonTemplateWeekday` match spec.

### 5. `src/lib/teacherBalance.ts` — PASS
`addToTeacherBalance`, `subtractFromTeacherBalance`, `addRegularLessonBalance` (instance-aware), `subtractRegularLessonBalance` (instance-aware), `addTrialLessonToBalance`, `subtractTrialLessonFromBalance` all present and correct. Uses `Math.max(0, ...)` for subtracts.

### 6. `src/lib/conflictDetection.ts` — PASS
`hasTimeOverlap` uses `startA < endB && endA > startB`. `checkTeacherConflicts` has both `excludeInstanceId` and `excludeStudentId`. `checkTeacherConflictsBatch` present. Checks both `lesson_instances` and `trial_lessons`.

### 7. `src/lib/instanceGeneration.ts` — PASS
`generateFutureInstanceDates`, `syncTemplateChange` (delete planned + regenerate, conflict check), `shiftLessonsForward` (saves originals, increments `rescheduled_count`) all present and match spec.

### 8. `src/hooks/useScheduleGrid.ts` — PASS
`ensureInstancesForWeek`: skips past weeks, no cap, generates per template slot, uses `maxLessonMap`. `fetchSchedule` calls `ensureInstancesForWeek` then fetches instances. Returns `mode`, `setMode`, `actualLessons`.

### 9. `src/components/EditStudentDialog.tsx` — PASS
- `studentUserId`/`teacherUserId` state
- `instanceIdMap` for lesson_number -> id
- `sortedLessonsForDisplay`: instance-based path with chronological sort, `datesUnassigned` check, padding
- `handleResetAllLessons`: deletes all instances, regenerates, clears tracking
- `confirmDateUpdate`: conflict checks with `excludeStudentId`, instance DB updates, `rebuildLegacyLessonDatesFromInstances`, `checkNonTemplateWeekday`
- `handleSubmit`: calls `syncTemplateChange` when instances exist, generates from scratch otherwise
- `handleDeleteStudent`: deletes `lesson_instances`
- `handleMarkLastLesson`/`handleUndoLastLesson`: instance-aware balance
- UI shows `start_time - end_time` per row

### 10. `src/components/LessonTracker.tsx` — PASS
- `pendingInstanceId` state
- `instanceStartTimes` map passed to `getSortedLessons`
- First-mark: syncs calculated dates to `lesson_instances`
- `handleLessonClick` passes `inst?.id`
- `confirmLessonComplete`: instance-aware balance via `addRegularLessonBalance(teacherId, studentId, matchingInstance.id)`

---

## Minor Issues Found

### 1. Orphaned file: `src/types/lessonInstance.ts`
This file duplicates interfaces from `src/lib/lessonTypes.ts` and has zero imports. Should be deleted to avoid confusion.

### 2. `confirmDateUpdate` — "Kalan gunleri de guncelle" ON path
The spec says when ON, it should use `generateFutureInstanceDates` from instance generation to regenerate subsequent planned instances from template. Current implementation uses `recalculateRemainingDates` (legacy date-only calculation) which only recalculates dates in the `lessonDates` JSON map, then updates instances with those dates. This means the **times are preserved from the original instance** rather than regenerated from template.

**Impact:** If template times have changed since instances were created, the "kalan gunleri de guncelle" ON path won't pick up new template times. The spec says it should regenerate from template including times.

**Fix:** In `confirmDateUpdate`, when `updateRemainingDays` is true, after identifying the first changed lesson, use `generateFutureInstanceDates` from template slots for subsequent lessons (similar to how `handleResetAllLessons` works), then update/delete/insert instances accordingly.

### 3. `src/utils/lessonDateUtils.ts` compatibility shim
This is fine — it re-exports from the new modules. No issue.

---

## Plan: Minimal Fixes

Only two changes needed:

### Fix 1: Delete orphaned `src/types/lessonInstance.ts`
- Delete the file (confirmed zero imports)

### Fix 2: Update `confirmDateUpdate` "kalan gunleri de guncelle" ON path
In `EditStudentDialog.tsx`, when `updateRemainingDays` is true:
1. Instead of calling `recalculateRemainingDates` (date-only), build template slots from current `lessons` state
2. Find the first changed instance and all subsequent planned instances
3. Use `generateFutureInstanceDates(templateSlots, count, startDate)` to regenerate dates+times
4. For each regenerated entry, run `checkTeacherConflicts` with `excludeStudentId`
5. Update instance rows with new `lesson_date`, `start_time`, `end_time`
6. Call `rebuildLegacyLessonDatesFromInstances` at the end

This aligns the ON path with the spec's requirement that regeneration respects template slot durations.

