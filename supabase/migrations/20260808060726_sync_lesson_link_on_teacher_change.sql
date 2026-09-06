-- Bug: students.lesson_link stores a per-student COPY of "the teacher's zoom link"
-- (LessonLinkDialog writes the same value onto every student row of a teacher, see
-- LessonLinkDialog.tsx handleSave). When a student is reassigned to a different
-- teacher (EditTeacherDialog.tsx handleTransferStudent), only teacher_id was updated
-- and lesson_link was left untouched, so the student's "Katıl" button (JoinLessonCard)
-- kept opening the OLD teacher's Zoom room.
--
-- Fix: resolve lesson_link automatically at the database level whenever a student's
-- teacher_id changes, or a new student row is inserted without an explicit link. This
-- protects against the bug recurring from ANY code path (current UI, edge functions,
-- future admin tools, manual SQL) instead of relying on every future call site
-- remembering to copy/clear the link by hand.

CREATE OR REPLACE FUNCTION public.sync_student_lesson_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.teacher_id IS DISTINCT FROM OLD.teacher_id)
     OR (TG_OP = 'INSERT' AND NEW.lesson_link IS NULL) THEN

    -- Adopt the new teacher's current link (same value shared across their other
    -- students). If the new teacher has no students with a link yet, fall back to
    -- NULL rather than keep the previous teacher's link -- a missing link surfaces
    -- as "link not added" in the UI, which is correct; a stale link would silently
    -- send the student to the wrong teacher's meeting.
    SELECT s.lesson_link INTO NEW.lesson_link
    FROM public.students s
    WHERE s.teacher_id = NEW.teacher_id
      AND s.id <> NEW.id
      AND s.lesson_link IS NOT NULL
    ORDER BY s.created_at DESC
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_student_lesson_link ON public.students;

CREATE TRIGGER trg_sync_student_lesson_link
BEFORE INSERT OR UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_lesson_link();
