

# Plan: Fix Archived Student Cleanup + İşlenen Dersler Consistency

## Revised Findings (After Code Audit)

### Issue 1: Archived students — PARTIALLY confirmed

The plan's claim that "actual mode doesn't filter archived students" is **outdated**. `useScheduleGrid.fetchSchedule()` (line 250) already filters instances by `activeStudentIds`. The grid display is correct.

**What IS broken:**
1. **Archive handler does no cleanup** (lines 1027-1055 in `EditStudentDialog.tsx`): Only sets `is_archived: true`. Does NOT delete `planned` instances or `lesson_overrides`. Orphaned data stays in DB.
2. **Conflict detection** (`conflictDetection.ts`): Queries `lesson_instances` by teacher+date with no archive check. Orphaned planned instances from archived students cause **false conflict blocks** for active students.
3. **`lesson_overrides`** for archived students remain and could cause stale data.

### Issue 2: İşlenen dersler — CONFIRMED

1. **`StudentLessonTracker` uses stale `lessons_per_week`** (line 112): Reads from `student_lesson_tracking.lessons_per_week`. This field IS updated when admin saves via `EditStudentDialog.handleSubmit` (line 646-654), but ONLY when the tracking record doesn't yet exist OR when the existing record is found. The real-time subscription (line 70) also reads `lessons_per_week` from the tracking table. So if the tracking record's `lessons_per_week` gets updated correctly, it should sync. **However**, the update only happens in the `else` branch (line 650-654) when instances don't exist. When instances DO exist (line 600-612), `lessons_per_week` is NOT updated in the tracking record. This is the bug.
2. **No `instanceStartTimes`** passed to `getSortedLessons` in `StudentLessonTracker` (line 125): Same-day lessons may sort differently than teacher panel.

---

## Fix Strategy

### Fix 1: Archive cleanup (EditStudentDialog.tsx)

In the archive handler (lines 1027-1055), after setting `is_archived: true`:
- Delete all `planned` instances: `DELETE FROM lesson_instances WHERE student_id = X AND teacher_id = Y AND status = 'planned'`
- Delete all `lesson_overrides`: `DELETE FROM lesson_overrides WHERE student_id = X AND teacher_id = Y`
- Keep `completed` instances (historical data)
- Keep `student_lessons` template + `student_lesson_tracking` (needed for unarchive)

### Fix 2: `lessons_per_week` sync on template save (EditStudentDialog.tsx)

In `handleSubmit`, when instances exist (line 600-612 branch), also update the tracking record's `lessons_per_week`:
```
await supabase
  .from("student_lesson_tracking")
  .update({ lessons_per_week: lessonsPerWeek })
  .eq("student_id", studentUserId)
  .eq("teacher_id", teacherUserId);
```

### Fix 3: StudentLessonTracker — use template count + instanceStartTimes

1. Fetch `student_lessons` count for the student to get live `lessonsPerWeek` instead of relying on potentially stale tracking field
2. Fetch `lesson_instances` to build `instanceStartTimes` map and pass to `getSortedLessons`

---

## Affected Files

| File | Change | Risk |
|------|--------|------|
| `src/components/EditStudentDialog.tsx` | Archive handler cleanup + `lessons_per_week` sync in instances branch | Low |
| `src/components/StudentLessonTracker.tsx` | Fetch `student_lessons` count + `lesson_instances` for `instanceStartTimes` | Low |

---

## Implementation Order

1. **EditStudentDialog archive handler** — add planned instance + override deletion
2. **EditStudentDialog handleSubmit** — add `lessons_per_week` update in the instances-exist branch
3. **StudentLessonTracker** — add `student_lessons` count fetch + `instanceStartTimes`

---

## Test Scenarios

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Archive student → check `lesson_instances` table | All `planned` deleted, `completed` kept |
| 2 | Archive student → schedule another at same time | No conflict |
| 3 | Archive student → admin weekly grid (actual mode) | Not visible |
| 4 | Unarchive student → view schedule | New instances generated via lazy gen |
| 5 | Change template from 2→3 slots via admin → check student panel | Shows 12 lessons (not 8) |
| 6 | Two same-day lessons → check student vs teacher panel ordering | Identical order |

