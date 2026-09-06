-- Reassigning a student to another teacher used to be six unordered client-side
-- UPDATEs in EditTeacherDialog.handleTransferStudent, of which only the first
-- checked its error. Two of them were also wrong about which rows belong to the
-- student and which belong to the teacher:
--
--   * lesson_instances -- the table the whole schedule, tracking and package
--     counter read -- was never touched, so every lesson stayed behind with the
--     previous teacher. Its RLS is teacher_id = auth.uid(), so the new teacher
--     saw an empty calendar while the old one kept seeing the student. It also
--     broke date editing: EditStudentDialog looks instances up by
--     (student_id, teacher_id, package_cycle) and found nothing to edit.
--   * notifications.teacher_id records who SENT a past message (NotificationBell
--     renders that teacher's name), so rewriting it falsifies history. That
--     UPDATE was also a silent no-op -- admins have no UPDATE policy on
--     notifications -- which is why nobody noticed.
--
-- Doing it in one SECURITY DEFINER function makes it atomic, gives the caller a
-- single truthful error, and lets it resolve the unique-key collisions that
-- appear when a student returns to a teacher they had before.

CREATE OR REPLACE FUNCTION public.rpc_transfer_student(
  p_student_record_id uuid,
  p_to_teacher_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student_user_id uuid;
  v_from_teacher_id uuid;
  v_cycle_offset integer;
  v_instances_moved integer;
  v_tracking_merged boolean := false;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can reassign a student to another teacher'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- The source teacher comes from the row itself, never from the caller: the
  -- client's idea of who owns the student can be stale by the time it posts.
  SELECT student_id, teacher_id
  INTO v_student_user_id, v_from_teacher_id
  FROM students
  WHERE id = p_student_record_id
  FOR UPDATE;

  IF v_student_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Student not found');
  END IF;

  IF v_from_teacher_id = p_to_teacher_id THEN
    RETURN json_build_object('success', false, 'error', 'Student is already assigned to this teacher');
  END IF;

  IF NOT public.has_role(p_to_teacher_id, 'teacher'::public.app_role) THEN
    RETURN json_build_object('success', false, 'error', 'Target user is not a teacher');
  END IF;

  -- A student who was with the target teacher before still has rows occupying
  -- (student_id, teacher_id, lesson_number, package_cycle) over there. Lifting
  -- every incoming cycle above the highest one already present keeps both
  -- histories and satisfies the unique constraint. Nothing shifts in the normal
  -- case, where the target teacher has no rows for this student at all.
  SELECT COALESCE(MAX(package_cycle), 0) INTO v_cycle_offset
  FROM lesson_instances
  WHERE student_id = v_student_user_id AND teacher_id = p_to_teacher_id;

  UPDATE lesson_instances
  SET teacher_id = p_to_teacher_id,
      package_cycle = package_cycle + v_cycle_offset
  WHERE student_id = v_student_user_id AND teacher_id = v_from_teacher_id;
  GET DIAGNOSTICS v_instances_moved = ROW_COUNT;

  -- student_lesson_tracking is UNIQUE (student_id, teacher_id), so a plain move
  -- raises 23505 when the target already holds a row. Merge onto it instead and
  -- drop the source row; the incoming package is the one that continues.
  IF EXISTS (
    SELECT 1 FROM student_lesson_tracking
    WHERE student_id = v_student_user_id AND teacher_id = p_to_teacher_id
  ) THEN
    UPDATE student_lesson_tracking dst
    SET lessons_per_week = src.lessons_per_week,
        package_cycle = src.package_cycle + v_cycle_offset,
        updated_at = now()
    FROM student_lesson_tracking src
    WHERE dst.student_id = v_student_user_id AND dst.teacher_id = p_to_teacher_id
      AND src.student_id = v_student_user_id AND src.teacher_id = v_from_teacher_id;

    DELETE FROM student_lesson_tracking
    WHERE student_id = v_student_user_id AND teacher_id = v_from_teacher_id;

    v_tracking_merged := true;
  ELSE
    UPDATE student_lesson_tracking
    SET teacher_id = p_to_teacher_id,
        package_cycle = package_cycle + v_cycle_offset,
        updated_at = now()
    WHERE student_id = v_student_user_id AND teacher_id = v_from_teacher_id;
  END IF;

  -- The weekly template describes the student's lessons, not the teacher's, so
  -- the incoming rows replace whatever the target still had from a previous stint.
  DELETE FROM student_lessons
  WHERE student_id = v_student_user_id AND teacher_id = p_to_teacher_id;

  UPDATE student_lessons
  SET teacher_id = p_to_teacher_id
  WHERE student_id = v_student_user_id AND teacher_id = v_from_teacher_id;

  UPDATE topics
  SET teacher_id = p_to_teacher_id
  WHERE student_id = v_student_user_id AND teacher_id = v_from_teacher_id;

  -- HomeworkSection and LessonNotesSection read these back by
  -- (student_id, teacher_id); left behind, the new teacher sees nothing.
  UPDATE homework_submissions
  SET teacher_id = p_to_teacher_id
  WHERE student_id = v_student_user_id AND teacher_id = v_from_teacher_id;

  UPDATE lesson_notes
  SET teacher_id = p_to_teacher_id
  WHERE student_id = v_student_user_id AND teacher_id = v_from_teacher_id;

  -- Deliberately staying with the previous teacher:
  --   notifications                         who sent a past message
  --   balance_events, teacher_balance,
  --   payment_history, admin_notifications  what they earned and were warned about
  --
  -- Last, because it fires trg_sync_student_lesson_link, which resolves the
  -- student's meeting link from the teacher they now belong to.
  UPDATE students
  SET teacher_id = p_to_teacher_id
  WHERE id = p_student_record_id;

  RETURN json_build_object(
    'success', true,
    'from_teacher_id', v_from_teacher_id,
    'instances_moved', v_instances_moved,
    'cycle_offset', v_cycle_offset,
    'tracking_merged', v_tracking_merged
  );
END;
$$;

-- The function refuses non-admins on its own, but anon has no business holding
-- EXECUTE on it; Supabase grants that by default to everything created in public.
REVOKE ALL ON FUNCTION public.rpc_transfer_student(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_transfer_student(uuid, uuid) TO authenticated;
