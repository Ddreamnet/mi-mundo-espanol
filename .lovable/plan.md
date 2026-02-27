
# AdminDashboard Decomposition: 1083 → ~240 Lines

## Overview

The `AdminDashboard.tsx` file contains 1083 lines with 3 major responsibilities mixed together: data fetching/CRUD, topic management logic, and UI rendering for 3 tabs. We will extract these into focused modules while keeping the UI and behavior 100% identical.

## Extraction Plan

### 1. Create `src/hooks/useAdminData.ts` (~150 lines)

Extract all data-fetching and teacher/student state management:
- `teachers`, `selectedTeacher`, `loading` state
- `fetchTeachers()` function (lines 78-151)
- `toggleStudent()`, `expandedStudents` state (lines 153-165)
- `openStudentSettings()`, `openTeacherSettings()` helpers
- `handleRestoreStudent()` (lines 495-517)

This hook returns `{ teachers, selectedTeacher, setSelectedTeacher, loading, fetchTeachers, expandedStudents, toggleStudent, ... }`

### 2. Create `src/hooks/useTopicManagement.ts` (~170 lines)

Extract all topic/resource CRUD operations:
- `studentTopics`, `studentCompletedTopics` state maps
- `fetchStudentTopics()` (lines 167-272) -- the complex parallel-fetch + merge logic
- `handleAddTopic()` (lines 293-326)
- `handleAddResource()` (lines 328-371)
- `handleEditTopic()` (lines 374-406)
- `handleEditResource()` (lines 408-451)
- `handleDeleteTopic()` (lines 453-472)
- `handleDeleteResource()` (lines 474-493)
- All related dialog state (`showAddTopic`, `editingTopic`, `selectedStudentForTopic`, etc.)

This hook accepts `{ selectedTeacher, profileUserId }` and returns all CRUD handlers + dialog state.

### 3. Create `src/components/admin/AdminStudentsTab.tsx` (~250 lines)

Extract the entire "Students" tab rendering (currently lines 644-967):
- Active students list with collapsible topic views
- "Islenen Konular" (processed topics) section per student
- Student-specific topics CRUD section per student
- Archived students section with restore button
- "Create Student" button

Props: receives all handlers and state from the hooks.

### 4. Create `src/components/admin/AdminTeachersList.tsx` (~80 lines)

Extract the teachers sidebar (lines 553-608):
- Teachers list rendering with selection highlight
- "Create Teacher" button
- Settings button per teacher

### 5. Create `src/components/admin/AdminDialogs.tsx` (~100 lines)

Extract all dialog instantiations (lines 990-1080):
- CreateTeacherDialog, EditTeacherDialog
- CreateStudentDialog, EditStudentDialog
- AddTopicDialog, AddResourceDialog
- EditTopicDialog, EditResourceDialog
- StudentAboutDialog, PagesManagerDialog

This is a simple wrapper component that receives all the dialog open/close state and handlers as props.

### 6. Refactored `AdminDashboard.tsx` (~240 lines)

What remains:
- Import hooks and sub-components
- Call `useAdminData()` and `useTopicManagement()`
- Header with action buttons
- Layout grid: `AdminTeachersList` (left) + tabbed content area (right)
- Tab buttons (students/schedule/payments)
- Tab content: `AdminStudentsTab`, `AdminWeeklySchedule`, `AdminBalanceManager`
- `AdminDialogs` at the bottom

### 7. Bonus: Fix TeacherDashboard duplicated `formatTime`

`TeacherDashboard.tsx` (line 155-162) still has its own inline `formatTime` instead of using the shared `formatTimeUtil` from `lessonDateUtils.ts`. Will update to use the shared utility.

## File Changes Summary

| Action | File | Lines |
|--------|------|-------|
| Create | `src/hooks/useAdminData.ts` | ~150 |
| Create | `src/hooks/useTopicManagement.ts` | ~170 |
| Create | `src/components/admin/AdminStudentsTab.tsx` | ~250 |
| Create | `src/components/admin/AdminTeachersList.tsx` | ~80 |
| Create | `src/components/admin/AdminDialogs.tsx` | ~100 |
| Modify | `src/components/AdminDashboard.tsx` | 1083 → ~240 |
| Modify | `src/components/TeacherDashboard.tsx` | Fix formatTime |

## Risk Mitigation

- No UI or behavioral changes -- purely structural extraction
- Each extraction preserves exact same props/state flow
- AdminWeeklySchedule and AdminBalanceManager remain untouched (already separate components)
- Incremental: hooks first, then UI components, then final assembly
