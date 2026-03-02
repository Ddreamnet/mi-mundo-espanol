
# Sync EWD Revival Changes to Mi Mundo Espanol

## Overview

The other project (EWD Revival) has evolved its scheduling system significantly beyond what this project currently has. This plan brings all 10 changed files into alignment. The changes fall into these categories:

1. **Missing files that need to be created** (3 files)
2. **Existing files that need major rewrites** (5 files)
3. **Existing files that need minor updates** (2 files)

---

## Gap Analysis

| Feature | EWD Revival (target) | Mi Mundo (current) | Status |
|---------|---------------------|--------------------| -------|
| `lessonSync.ts` | Exists with `rebuildLegacyLessonDatesFromInstances` + `checkNonTemplateWeekday` | Does not exist | MISSING |
| `lessonTypes.ts` | Consolidated types + helpers (`LessonInstance`, `formatTime`, `calculateDurationMinutes`, `getDayName`, `getRowConfig`) | Types split across `types/lessons.ts` + `types/lessonInstance.ts` | NEEDS MERGE |
| `lessonSorting.ts` | Exists with `instanceStartTimes` parameter for time-aware sorting | Does not exist (logic inline in `lessonDateUtils.ts`) | MISSING |
| `lessonDateCalculation.ts` | Standalone file with `calculateLessonDates`, `recalculateRemainingDates`, `calculateNextLessonDate` | Logic lives in `lessonDateUtils.ts` and inline in `EditStudentDialog` | NEEDS EXTRACTION |
| `conflictDetection.ts` | Has `excludeStudentId` parameter + `checkTeacherConflictsBatch` | Missing `excludeStudentId`, no batch function | PARTIAL |
| `instanceGeneration.ts` | Has `generateFutureInstanceDates`, `syncTemplateChange` (with delete/insert approach), `shiftLessonsForward` | Has `generateFutureInstances` (different signature), `syncTemplateChange` (different approach), no `shiftLessonsForward` | NEEDS REWRITE |
| `teacherBalance.ts` (as `src/lib/teacherBalance.ts`) | Consolidated in `src/lib/` with `addToTeacherBalance`/`subtractFromTeacherBalance` generic functions | Lives in `src/services/teacherBalanceService.ts` with separate functions per type | NEEDS REWRITE + MOVE |
| `useScheduleGrid.ts` | Has `ensureInstancesForWeek` (lazy generation, no cap), `fetchActualLessonsForWeek` | Has basic actual mode fetch but no `ensureInstancesForWeek` | NEEDS MAJOR UPDATE |
| `EditStudentDialog.tsx` | Instance-driven lesson list, `confirmDateUpdate` with conflict checks + `excludeStudentId`, `handleResetAllLessons` deletes + regenerates instances, `handleSubmit` calls `syncTemplateChange` | Legacy JSON-driven, no conflict checks in `confirmDateUpdate`, reset only changes status, `handleSubmit` doesn't sync instances | NEEDS MAJOR REWRITE |
| `LessonTracker.tsx` | Has `pendingInstanceId`, `instanceStartTimes` map, syncs instance dates on first mark, instance-aware balance | Partially instance-aware but missing `instanceStartTimes`, missing date sync to instances | NEEDS UPDATE |

---

## Step-by-Step Implementation

### Step 1: Create `src/lib/lessonTypes.ts`

New file consolidating types and utility functions from the other project:
- `LessonDates`, `LessonOverrideInfo`, `SortedLesson`, `DisplayLessonData`, `LessonInstance`
- `getRowConfig(lessonsPerWeek)` -- moved from `lessonDateUtils.ts`
- `formatTime(time)` -- moved from `lessonDateUtils.ts`
- `calculateDurationMinutes(startTime, endTime)` -- moved from `lessonDateUtils.ts`
- `getDayName(dayOfWeek)` -- new helper

### Step 2: Create `src/lib/lessonSorting.ts`

New file with:
- `getSortedLessons(lessonDates, lessonOverrides, totalLessons, instanceStartTimes?)` -- adds optional `instanceStartTimes` param for time-aware sorting of same-date lessons
- `getDisplayLessonData(sortedLessons, lessonDates, displayPosition)` -- moved from `lessonDateUtils.ts`

### Step 3: Create `src/lib/lessonDateCalculation.ts`

New file extracting:
- `calculateLessonDates(markedLessonNumber, markedDate, studentLessonDays, totalLessons)` -- from `lessonDateUtils.ts`
- `recalculateRemainingDates(fromLessonNumber, startDate, currentDates, lessonDays, totalLessons)` -- from `EditStudentDialog` inline logic
- `calculateNextLessonDate(currentDate, lessonDays)` -- from `LessonOverrideDialog` inline logic

### Step 4: Create `src/lib/lessonSync.ts`

New file with:
- `rebuildLegacyLessonDatesFromInstances(studentId, teacherId)` -- reads all instances, builds `lesson_number -> lesson_date` map, updates `student_lesson_tracking.lesson_dates`
- `checkNonTemplateWeekday(studentId, teacherId, dateStr)` -- checks if date falls on a template day, shows info toast if not

### Step 5: Rewrite `src/lib/conflictDetection.ts`

Add:
- `excludeStudentId` parameter to `checkTeacherConflicts` -- filters out ALL instances for that student (prevents self-conflict)
- `checkTeacherConflictsBatch(teacherId, instances[])` -- batch conflict check for multiple instances

### Step 6: Rewrite `src/lib/instanceGeneration.ts`

Replace current implementation with EWD Revival version:
- `generateFutureInstanceDates(templateSlots, count, startFromDate)` -- simpler signature, returns `{ lessonDate, startTime, endTime }[]`
- `syncTemplateChange(studentId, teacherId, newSlots, totalLessons)` -- reads existing instances from DB, preserves completed, regenerates planned, handles delete/insert of excess/missing, runs conflict checks
- `shiftLessonsForward(studentId, teacherId, fromInstanceId, templateSlots)` -- "Sonraki Derse Aktar" implementation: shifts target + subsequent planned instances forward by one template slot, saves originals, checks conflicts

### Step 7: Rewrite `src/lib/teacherBalance.ts` (move from `src/services/teacherBalanceService.ts`)

Create `src/lib/teacherBalance.ts` with the EWD Revival consolidated approach:
- `addToTeacherBalance({ teacherId, lessonType, startTime, endTime })` -- generic add
- `subtractFromTeacherBalance({ ... })` -- generic subtract with `Math.max(0, ...)`
- `addRegularLessonBalance(teacherId, studentId, instanceId?)` -- instance-aware wrapper
- `subtractRegularLessonBalance(teacherId, studentId, instanceId?)` -- instance-aware wrapper

Update all imports across the codebase to use the new path.

### Step 8: Rewrite `src/hooks/useScheduleGrid.ts`

Add `ensureInstancesForWeek(teacherId, weekStart)`:
- Skip fully past weeks (`weekEnd < today`)
- Fetch template slots from `student_lessons`
- Fetch active students from `students`
- Check existing instances for the week
- Find students with templates but no instances for this week (`missingStudents`)
- For each missing student, get `maxLessonNumber` from existing instances
- Generate instances for each template slot (NO cap on total count)
- Bulk insert into `lesson_instances`

Update `fetchSchedule` to call `ensureInstancesForWeek` before fetching actual instances.

### Step 9: Major rewrite of `src/components/EditStudentDialog.tsx`

Key changes aligned with EWD Revival:
- Add `studentUserId` / `teacherUserId` state (resolved once from `students` table)
- Add `instanceIdMap: Record<string, string>` for `lesson_number -> id` mapping
- **`sortedLessonsForDisplay`**: Instance-based path when `instances.length > 0`:
  - Sort by `(lesson_date, start_time)` chronologically
  - Cap to `totalLessons` (= `lessonsPerWeek * 4`)
  - Handle `datesUnassigned` state (after reset, `Object.keys(lessonDates).length === 0`)
- **`handleResetAllLessons`**: Delete ALL instances, regenerate from template with `generateFutureInstanceDates`, single-insert each, clear `lesson_dates: {}` and `completed_lessons: []`
- **`confirmDateUpdate`**: Add conflict checks with `excludeStudentId`, update instance rows in-place, call `rebuildLegacyLessonDatesFromInstances`, call `checkNonTemplateWeekday`
- **`handleSubmit`**: Call `syncTemplateChange` when instances exist, create tracking record + generate instances when they don't
- **`handleDeleteStudent`**: Add `lesson_instances` deletion

### Step 10: Update `src/components/LessonTracker.tsx`

Key changes:
- Add `pendingInstanceId` state
- Add `instanceStartTimes` map passed to `getSortedLessons`
- In `confirmLessonComplete` first-mark path: sync calculated dates to `lesson_instances` (update each instance's `lesson_date`)
- Pass `instanceId` to `handleLessonClick`

### Step 11: Update imports across all consuming files

Update all files that import from the old locations:
- `src/utils/lessonDateUtils.ts` keeps `getLocale`, `formatTime`, `calculateLessonDuration` as re-exports or utilities
- `AdminWeeklySchedule.tsx`, `WeeklyScheduleDialog.tsx`, `TeacherDashboard.tsx` -- update balance service imports
- `LessonOverrideDialog.tsx` stays mostly unchanged (still uses `lesson_overrides` table for now, conflict check already present)

---

## Files Summary

| Action | File | Description |
|--------|------|-------------|
| CREATE | `src/lib/lessonTypes.ts` | Consolidated types + helpers |
| CREATE | `src/lib/lessonSorting.ts` | Sorting with time-awareness |
| CREATE | `src/lib/lessonDateCalculation.ts` | Date calculation algorithms |
| CREATE | `src/lib/lessonSync.ts` | Legacy sync + template weekday check |
| CREATE | `src/lib/teacherBalance.ts` | Consolidated balance operations |
| REWRITE | `src/lib/conflictDetection.ts` | Add `excludeStudentId` + batch check |
| REWRITE | `src/lib/instanceGeneration.ts` | New API: `generateFutureInstanceDates`, `shiftLessonsForward` |
| REWRITE | `src/hooks/useScheduleGrid.ts` | Add `ensureInstancesForWeek` lazy generation |
| REWRITE | `src/components/EditStudentDialog.tsx` | Instance-driven lesson list, conflict checks, template sync |
| UPDATE | `src/components/LessonTracker.tsx` | `pendingInstanceId`, `instanceStartTimes`, date sync |
| UPDATE | `src/utils/lessonDateUtils.ts` | Keep as compatibility shim, delegate to new files |
| DELETE | `src/services/teacherBalanceService.ts` | Replaced by `src/lib/teacherBalance.ts` |
| UPDATE | Various consumers | Fix imports for moved functions |

---

## Risk Mitigation

- All changes are structural refactors that preserve existing UI behavior
- `ensureInstancesForWeek` with no cap fixes the visibility bug where students with completed months don't appear in new weeks
- `excludeStudentId` in conflict detection prevents false self-conflicts when editing a student's own dates
- `rebuildLegacyLessonDatesFromInstances` keeps `student_lesson_tracking.lesson_dates` in sync as a safety net for any code still reading from it
- Balance operations remain identical in behavior, just consolidated into fewer functions
