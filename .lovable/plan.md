
# Major Scheduling Upgrade: Implementation Plan

## Summary

This is a large-scale upgrade introducing a `lesson_instances` table, conflict detection, instance generation, and UI enhancements across the scheduling system. The plan is broken into 8 phases, each independently testable.

---

## Phase 1: Database -- Create `lesson_instances` Table

**SQL Migration:**
- Create `lesson_instances` table with columns: `id`, `student_id`, `teacher_id`, `lesson_number`, `lesson_date`, `start_time`, `end_time`, `status` (planned/completed/cancelled), `original_date`, `original_start_time`, `original_end_time`, `rescheduled_count`, `created_at`, `updated_at`
- Add UNIQUE constraint on `(student_id, teacher_id, lesson_number)`
- Create indexes on `(teacher_id, lesson_date, start_time, end_time)` and `(student_id, teacher_id, status)`
- Add RLS policies mirroring `student_lesson_tracking`: admin ALL, teacher ALL on own, student SELECT on own

**Data Migration Script:**
- For each `student_lesson_tracking` record, read `lesson_dates` JSON and `completed_lessons` array
- For each lesson number in `lesson_dates`, look up the student's template slot from `student_lessons` (matching by `day_of_week` derived from the stored date) to get `start_time`/`end_time`
- Insert into `lesson_instances` with `status = 'completed'` if lesson_number is in `completed_lessons`, else `'planned'`
- For each `lesson_overrides` row: find matching instance by `original_date`, update its fields, set `rescheduled_count = 1`. If `is_cancelled`, set `status = 'cancelled'`

---

## Phase 2: Conflict Detection Service

**New file: `src/lib/conflictDetection.ts`**

- `hasTimeOverlap(startA, endA, startB, endB)`: Pure function, returns `startA < endB && endA > startB` (allows back-to-back where endA === startB)
- `ConflictInfo` interface: `{ studentName, date, timeRange, type: 'lesson' | 'trial', teacherId }`
- `checkTeacherConflicts(teacherId, date, startTime, endTime, excludeInstanceId?)`: Queries `lesson_instances` (planned/completed) and `trial_lessons` for that teacher on that date, runs overlap check, returns `ConflictInfo[]`

---

## Phase 3: Instance Generation

**New file: `src/lib/instanceGeneration.ts`**

- `generateFutureInstances(templateSlots, existingInstances, totalLessons, startFromDate)`: Generates instance data from template slots for lessons not yet completed
- `syncTemplateChange(studentId, teacherId, newSlots, existingInstances)`: Keeps completed instances, regenerates planned ones from new template slots, runs conflict checks, returns `{ instances, conflicts }`

**New file: `src/types/lessonInstance.ts`**

- `LessonInstance` interface matching the DB schema
- `TemplateSlot` interface: `{ dayOfWeek, startTime, endTime }`

---

## Phase 4: Balance Service Update

**Modified file: `src/services/teacherBalanceService.ts`**

- Add `addRegularLessonToBalanceFromInstance(teacherId, instanceId)`: Reads `start_time`/`end_time` from `lesson_instances` instead of template
- Add `subtractRegularLessonFromBalanceByInstance(teacherId, instanceId)`: Same but subtract
- Keep existing functions for backward compatibility during transition

**Modified file: `src/components/EditStudentDialog.tsx`** (balance functions only)

- `updateTeacherBalance` and `subtractFromTeacherBalance` (lines 339-420): Replace with calls to `teacherBalanceService` functions, passing instance data when available

---

## Phase 5: Lessons List Upgrade (EditStudentDialog)

**Modified file: `src/components/EditStudentDialog.tsx`**

Current: Shows `Ders N | date input` per lesson row, reads from `lesson_dates` JSON
New: Shows `Ders N | date | start_time - end_time | date input` per lesson row, reads from `lesson_instances`

Changes:
- Fetch `lesson_instances` instead of (or alongside) `lesson_dates` JSON
- Sort instances by `(lesson_date, start_time)` for chronological "Ders N" labels
- Display `start_time - end_time` as read-only text next to each date
- Date edit with "Kalan gunleri de guncelle" checkbox:
  - OFF: Only updates `lesson_date` on the instance, preserves times
  - ON: Regenerates that instance and all subsequent planned instances from template using `syncTemplateChange`
- Before saving: call `checkTeacherConflicts` for all affected instances, block on conflict
- Mark/undo lesson: update `lesson_instances.status` AND `completed_lessons` array (kept in sync), call instance-aware balance functions

---

## Phase 6: Override Dialog Enhancements

**Modified file: `src/components/LessonOverrideDialog.tsx`**

- "Sonraki Derse Aktar": Find instance, shift it and all subsequent planned instances forward by one template slot using `instanceGeneration.ts`. Run conflict checks. Update `lesson_instances` in-place (set `original_date`/times if not set)
- "Baska Tarihe Aktar": Update instance's `lesson_date` in-place. Pre-fill time inputs with current start/end. Run conflict check before save. Set `original_*` fields and increment `rescheduled_count`
- "Geri Al": Restore from `original_*` fields, clear them, reset `rescheduled_count`
- All operations also sync `lesson_dates` JSON in `student_lesson_tracking` for backward compatibility with `LessonTracker` grid

---

## Phase 7: Weekly Grid Upgrade

### 7A: Template/Actual Toggle

**Modified files: `src/components/AdminWeeklySchedule.tsx`, `src/components/WeeklyScheduleDialog.tsx`**

- Add `Switch` component near header: "Template | Actual"
- INACTIVE (default = Actual): Queries `lesson_instances` WHERE `lesson_date` is in current week, plus `trial_lessons`. Shows moved lessons in their actual position
- ACTIVE (Template): Shows only `student_lessons` template slots. No trials, no overrides

**Modified file: `src/hooks/useScheduleGrid.ts`**

- Add `mode: 'template' | 'actual'` parameter
- In 'actual' mode: fetch `lesson_instances` for current week instead of `student_lessons`
- In 'template' mode: existing behavior (fetch `student_lessons`)

### 7B: Back-to-Back Grouping

- Detect consecutive lessons for same student on same day where `end_time` of one === `start_time` of next
- Render as single combined card with "2 ders" badge
- Click shows popover/menu to select which instance to modify

---

## Phase 8: Trial Lesson Conflict Validation + Tracker Updates

**Modified file: `src/components/AddTrialLessonDialog.tsx`**

- Before saving: call `checkTeacherConflicts(teacherId, lessonDate, startTime, endTime)`
- If conflicts found: block save, show conflict summary

**Modified files: `src/components/LessonTracker.tsx`, `src/components/StudentLessonTracker.tsx`**

- Read from `lesson_instances` for per-lesson date + time data
- Continue using `completed_lessons` array for grid checkmark display (kept in sync)
- Update `getSortedLessons` in `lessonDateUtils.ts` to accept time data, sort by `(date, startTime)`

**Modified file: `src/utils/lessonDateUtils.ts`**

- Update `getSortedLessons` to support time-aware sorting key

---

## New Files Summary

| File | Purpose | Est. Lines |
|------|---------|-----------|
| SQL migration | `lesson_instances` table + RLS + data migration | ~80 |
| `src/lib/conflictDetection.ts` | Overlap checks + teacher conflict queries | ~80 |
| `src/lib/instanceGeneration.ts` | Generate/regenerate instances from template | ~100 |
| `src/types/lessonInstance.ts` | `LessonInstance` + `TemplateSlot` interfaces | ~30 |

## Modified Files Summary

| File | Key Changes |
|------|------------|
| `src/services/teacherBalanceService.ts` | Add instance-aware balance functions |
| `src/components/EditStudentDialog.tsx` | Show times per row, instance-based CRUD, conflict checks |
| `src/components/LessonOverrideDialog.tsx` | Instance-based postpone/move/revert with conflict checks |
| `src/components/AdminWeeklySchedule.tsx` | Template/Actual toggle, back-to-back grouping |
| `src/components/WeeklyScheduleDialog.tsx` | Template/Actual toggle, back-to-back grouping |
| `src/hooks/useScheduleGrid.ts` | Support template vs actual mode |
| `src/components/LessonTracker.tsx` | Read from instances, instance-aware balance |
| `src/components/StudentLessonTracker.tsx` | Read from instances |
| `src/utils/lessonDateUtils.ts` | Time-aware sorting |
| `src/components/AddTrialLessonDialog.tsx` | Conflict validation before save |

## Untouched Files

All landing page components, auth, blog, topics, homework, notifications, admin directory restructuring, and i18n remain unchanged.

## Implementation Order

Phases are sequential (each builds on the previous):
1. DB migration (foundation)
2. Conflict detection (pure logic, no UI changes)
3. Instance generation (pure logic, no UI changes)
4. Balance service update (low risk, backward compat)
5. EditStudentDialog upgrade (medium complexity)
6. LessonOverrideDialog upgrade (medium complexity)
7. Weekly grid upgrade (medium complexity)
8. Trial lesson validation + tracker updates (low complexity)

Each phase is independently deployable and testable. Phases 1-4 are additive and do not break existing functionality.
