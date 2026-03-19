
-- Phase 1b: RPC functions with legacy compat (transition period)

-- RPC: rpc_complete_lesson
CREATE OR REPLACE FUNCTION public.rpc_complete_lesson(
  p_instance_id uuid,
  p_teacher_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instance lesson_instances%ROWTYPE;
  v_duration_minutes integer;
  v_current_cycle integer;
  v_first_planned_id uuid;
  v_tracking_id uuid;
  v_completed_arr integer[];
BEGIN
  SELECT * INTO v_instance
  FROM lesson_instances
  WHERE id = p_instance_id AND teacher_id = p_teacher_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Instance not found');
  END IF;

  IF v_instance.status = 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Already completed');
  END IF;

  SELECT package_cycle INTO v_current_cycle
  FROM student_lesson_tracking
  WHERE student_id = v_instance.student_id AND teacher_id = p_teacher_id;

  IF v_current_cycle IS NULL THEN
    v_current_cycle := 1;
  END IF;

  SELECT id INTO v_first_planned_id
  FROM lesson_instances
  WHERE student_id = v_instance.student_id
    AND teacher_id = p_teacher_id
    AND status = 'planned'
    AND package_cycle = v_current_cycle
  ORDER BY lesson_date ASC, start_time ASC
  LIMIT 1;

  IF v_first_planned_id IS NULL OR v_first_planned_id != p_instance_id THEN
    RETURN json_build_object('success', false, 'error', 'Not the next completable lesson');
  END IF;

  v_duration_minutes := EXTRACT(EPOCH FROM (v_instance.end_time - v_instance.start_time)) / 60;

  UPDATE lesson_instances
  SET status = 'completed', updated_at = now()
  WHERE id = p_instance_id;

  INSERT INTO teacher_balance (teacher_id, total_minutes, completed_regular_lessons, regular_lessons_minutes)
  VALUES (p_teacher_id, v_duration_minutes, 1, v_duration_minutes)
  ON CONFLICT (teacher_id) DO UPDATE SET
    total_minutes = teacher_balance.total_minutes + v_duration_minutes,
    completed_regular_lessons = teacher_balance.completed_regular_lessons + 1,
    regular_lessons_minutes = teacher_balance.regular_lessons_minutes + v_duration_minutes,
    updated_at = now();

  INSERT INTO balance_events (teacher_id, event_type, amount_minutes, instance_id, student_id, package_cycle)
  VALUES (p_teacher_id, 'lesson_complete', v_duration_minutes, p_instance_id, v_instance.student_id, v_current_cycle);

  -- Legacy compat: update completed_lessons array
  SELECT id, completed_lessons INTO v_tracking_id, v_completed_arr
  FROM student_lesson_tracking
  WHERE student_id = v_instance.student_id AND teacher_id = p_teacher_id;

  IF v_tracking_id IS NOT NULL THEN
    IF v_completed_arr IS NULL THEN
      v_completed_arr := ARRAY[]::integer[];
    END IF;
    IF NOT (v_instance.lesson_number = ANY(v_completed_arr)) THEN
      v_completed_arr := array_append(v_completed_arr, v_instance.lesson_number);
    END IF;
    UPDATE student_lesson_tracking
    SET completed_lessons = v_completed_arr, updated_at = now()
    WHERE id = v_tracking_id;
  END IF;

  RETURN json_build_object('success', true, 'duration_minutes', v_duration_minutes);
END;
$$;

-- RPC: rpc_undo_complete_lesson
CREATE OR REPLACE FUNCTION public.rpc_undo_complete_lesson(
  p_instance_id uuid,
  p_teacher_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instance lesson_instances%ROWTYPE;
  v_duration_minutes integer;
  v_current_cycle integer;
  v_last_completed_id uuid;
  v_tracking_id uuid;
  v_completed_arr integer[];
BEGIN
  SELECT * INTO v_instance
  FROM lesson_instances
  WHERE id = p_instance_id AND teacher_id = p_teacher_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Instance not found');
  END IF;

  IF v_instance.status != 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Instance is not completed');
  END IF;

  SELECT package_cycle INTO v_current_cycle
  FROM student_lesson_tracking
  WHERE student_id = v_instance.student_id AND teacher_id = p_teacher_id;

  IF v_current_cycle IS NULL THEN
    v_current_cycle := 1;
  END IF;

  SELECT id INTO v_last_completed_id
  FROM lesson_instances
  WHERE student_id = v_instance.student_id
    AND teacher_id = p_teacher_id
    AND status = 'completed'
    AND package_cycle = v_current_cycle
  ORDER BY lesson_date DESC, start_time DESC
  LIMIT 1;

  IF v_last_completed_id IS NULL OR v_last_completed_id != p_instance_id THEN
    RETURN json_build_object('success', false, 'error', 'Can only undo the most recent completed lesson');
  END IF;

  v_duration_minutes := EXTRACT(EPOCH FROM (v_instance.end_time - v_instance.start_time)) / 60;

  UPDATE lesson_instances
  SET status = 'planned', updated_at = now()
  WHERE id = p_instance_id;

  UPDATE teacher_balance SET
    total_minutes = GREATEST(0, total_minutes - v_duration_minutes),
    completed_regular_lessons = GREATEST(0, completed_regular_lessons - 1),
    regular_lessons_minutes = GREATEST(0, regular_lessons_minutes - v_duration_minutes),
    updated_at = now()
  WHERE teacher_id = p_teacher_id;

  INSERT INTO balance_events (teacher_id, event_type, amount_minutes, instance_id, student_id, package_cycle)
  VALUES (p_teacher_id, 'lesson_undo', -v_duration_minutes, p_instance_id, v_instance.student_id, v_current_cycle);

  -- Legacy compat: remove from completed_lessons array
  SELECT id, completed_lessons INTO v_tracking_id, v_completed_arr
  FROM student_lesson_tracking
  WHERE student_id = v_instance.student_id AND teacher_id = p_teacher_id;

  IF v_tracking_id IS NOT NULL AND v_completed_arr IS NOT NULL THEN
    v_completed_arr := array_remove(v_completed_arr, v_instance.lesson_number);
    UPDATE student_lesson_tracking
    SET completed_lessons = v_completed_arr, updated_at = now()
    WHERE id = v_tracking_id;
  END IF;

  RETURN json_build_object('success', true, 'duration_minutes', v_duration_minutes);
END;
$$;

-- RPC: rpc_reset_package
CREATE OR REPLACE FUNCTION public.rpc_reset_package(
  p_student_id uuid,
  p_teacher_id uuid,
  p_template_slots jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_cycle integer;
  v_new_cycle integer;
  v_weekly_count integer;
  v_total_lessons integer;
  v_slot jsonb;
  v_day_of_week integer;
  v_start_date date;
  v_lesson_num integer := 0;
  v_max_iterations integer := 200;
  v_iter integer := 0;
BEGIN
  SELECT package_cycle INTO v_current_cycle
  FROM student_lesson_tracking
  WHERE student_id = p_student_id AND teacher_id = p_teacher_id;

  IF v_current_cycle IS NULL THEN
    v_current_cycle := 1;
  END IF;

  v_new_cycle := v_current_cycle + 1;
  v_weekly_count := jsonb_array_length(p_template_slots);
  v_total_lessons := v_weekly_count * 4;

  INSERT INTO balance_events (teacher_id, event_type, amount_minutes, student_id, package_cycle, notes)
  VALUES (p_teacher_id, 'balance_reset', 0, p_student_id, v_current_cycle,
          'Package reset from cycle ' || v_current_cycle || ' to ' || v_new_cycle);

  DELETE FROM lesson_instances
  WHERE student_id = p_student_id
    AND teacher_id = p_teacher_id
    AND package_cycle = v_current_cycle
    AND status = 'planned';

  UPDATE student_lesson_tracking
  SET package_cycle = v_new_cycle,
      completed_lessons = ARRAY[]::integer[],
      lesson_dates = '{}'::jsonb,
      updated_at = now()
  WHERE student_id = p_student_id AND teacher_id = p_teacher_id;

  v_start_date := CURRENT_DATE;

  WHILE v_lesson_num < v_total_lessons AND v_iter < v_max_iterations LOOP
    v_iter := v_iter + 1;
    FOR v_slot IN SELECT * FROM jsonb_array_elements(p_template_slots) LOOP
      v_day_of_week := (v_slot->>'dayOfWeek')::integer;
      IF EXTRACT(DOW FROM v_start_date) = v_day_of_week AND v_lesson_num < v_total_lessons THEN
        v_lesson_num := v_lesson_num + 1;
        INSERT INTO lesson_instances (student_id, teacher_id, lesson_number, lesson_date, start_time, end_time, status, package_cycle)
        VALUES (p_student_id, p_teacher_id, v_lesson_num, v_start_date,
                (v_slot->>'startTime')::time, (v_slot->>'endTime')::time, 'planned', v_new_cycle);
      END IF;
    END LOOP;
    v_start_date := v_start_date + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'new_cycle', v_new_cycle, 'instances_created', v_lesson_num);
END;
$$;

-- RPC: rpc_archive_student (with lesson_overrides cleanup during transition)
CREATE OR REPLACE FUNCTION public.rpc_archive_student(
  p_student_record_id uuid,
  p_student_user_id uuid,
  p_teacher_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_planned integer;
BEGIN
  UPDATE students
  SET is_archived = true, archived_at = now()
  WHERE id = p_student_record_id;

  DELETE FROM lesson_instances
  WHERE student_id = p_student_user_id
    AND teacher_id = p_teacher_user_id
    AND status = 'planned';
  GET DIAGNOSTICS v_deleted_planned = ROW_COUNT;

  DELETE FROM lesson_overrides
  WHERE student_id = p_student_user_id
    AND teacher_id = p_teacher_user_id;

  RETURN json_build_object('success', true, 'deleted_planned_instances', v_deleted_planned);
END;
$$;

-- RPC: rpc_delete_student
CREATE OR REPLACE FUNCTION public.rpc_delete_student(
  p_student_record_id uuid,
  p_student_user_id uuid,
  p_teacher_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_topic_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_topic_ids
  FROM topics
  WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;

  IF v_topic_ids IS NOT NULL AND array_length(v_topic_ids, 1) > 0 THEN
    DELETE FROM resources WHERE topic_id = ANY(v_topic_ids);
    DELETE FROM topics WHERE id = ANY(v_topic_ids);
  END IF;

  DELETE FROM student_resource_completion WHERE student_id = p_student_user_id;
  DELETE FROM student_lesson_tracking WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;
  DELETE FROM student_lessons WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;
  DELETE FROM homework_submissions WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;
  DELETE FROM lesson_instances WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;
  DELETE FROM lesson_overrides WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;
  DELETE FROM lesson_notes WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;
  DELETE FROM notifications WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;
  DELETE FROM admin_notifications WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;

  DELETE FROM students WHERE id = p_student_record_id;
  DELETE FROM profiles WHERE user_id = p_student_user_id;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN others THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- RPC: rpc_restore_student
CREATE OR REPLACE FUNCTION public.rpc_restore_student(
  p_student_record_id uuid,
  p_student_user_id uuid,
  p_teacher_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_slot record;
  v_slots jsonb := '[]'::jsonb;
  v_weekly_count integer := 0;
  v_total_lessons integer;
  v_completed_count integer;
  v_remaining integer;
  v_current_cycle integer;
  v_start_date date;
  v_lesson_date date;
  v_lesson_num integer;
  v_day_of_week integer;
  v_max_iterations integer := 200;
  v_iter integer := 0;
BEGIN
  UPDATE students
  SET is_archived = false, archived_at = null
  WHERE id = p_student_record_id;

  FOR v_slot IN
    SELECT day_of_week, start_time, end_time
    FROM student_lessons
    WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id
    ORDER BY day_of_week, start_time
  LOOP
    v_weekly_count := v_weekly_count + 1;
    v_slots := v_slots || jsonb_build_object(
      'dayOfWeek', v_slot.day_of_week,
      'startTime', v_slot.start_time::text,
      'endTime', v_slot.end_time::text
    );
  END LOOP;

  IF v_weekly_count = 0 THEN
    RETURN json_build_object('success', true, 'instances_created', 0, 'message', 'No template slots');
  END IF;

  SELECT package_cycle INTO v_current_cycle
  FROM student_lesson_tracking
  WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;

  IF v_current_cycle IS NULL THEN
    v_current_cycle := 1;
  END IF;

  SELECT count(*) INTO v_completed_count
  FROM lesson_instances
  WHERE student_id = p_student_user_id
    AND teacher_id = p_teacher_user_id
    AND status = 'completed'
    AND package_cycle = v_current_cycle;

  v_total_lessons := v_weekly_count * 4;
  v_remaining := v_total_lessons - v_completed_count;

  IF v_remaining <= 0 THEN
    RETURN json_build_object('success', true, 'instances_created', 0, 'message', 'All lessons already completed');
  END IF;

  v_start_date := CURRENT_DATE;
  v_lesson_num := v_completed_count;

  WHILE v_lesson_num < v_total_lessons AND v_iter < v_max_iterations LOOP
    v_iter := v_iter + 1;
    FOR v_slot IN SELECT * FROM jsonb_array_elements(v_slots) AS s LOOP
      v_day_of_week := (v_slot.s->>'dayOfWeek')::integer;
      IF EXTRACT(DOW FROM v_start_date) = v_day_of_week AND v_lesson_num < v_total_lessons THEN
        v_lesson_num := v_lesson_num + 1;
        INSERT INTO lesson_instances (student_id, teacher_id, lesson_number, lesson_date, start_time, end_time, status, package_cycle)
        VALUES (p_student_user_id, p_teacher_user_id, v_lesson_num, v_start_date,
                (v_slot.s->>'startTime')::time, (v_slot.s->>'endTime')::time, 'planned', v_current_cycle);
      END IF;
    END LOOP;
    v_start_date := v_start_date + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'instances_created', v_lesson_num - v_completed_count);
END;
$$;

-- RPC: rpc_manual_balance_adjust
CREATE OR REPLACE FUNCTION public.rpc_manual_balance_adjust(
  p_teacher_id uuid,
  p_amount_minutes integer,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE teacher_balance SET
    manual_adjustment_minutes = manual_adjustment_minutes + p_amount_minutes,
    total_minutes = total_minutes + p_amount_minutes,
    updated_at = now()
  WHERE teacher_id = p_teacher_id;

  INSERT INTO balance_events (teacher_id, event_type, amount_minutes, notes)
  VALUES (p_teacher_id, 'manual_adjust', p_amount_minutes, p_notes);

  RETURN json_build_object('success', true);
END;
$$;

-- RPC: rpc_complete_trial_lesson
CREATE OR REPLACE FUNCTION public.rpc_complete_trial_lesson(
  p_trial_id uuid,
  p_teacher_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial trial_lessons%ROWTYPE;
  v_duration_minutes integer;
BEGIN
  SELECT * INTO v_trial
  FROM trial_lessons
  WHERE id = p_trial_id AND teacher_id = p_teacher_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Trial lesson not found');
  END IF;

  IF v_trial.is_completed THEN
    RETURN json_build_object('success', false, 'error', 'Already completed');
  END IF;

  v_duration_minutes := EXTRACT(EPOCH FROM (v_trial.end_time - v_trial.start_time)) / 60;

  UPDATE trial_lessons SET is_completed = true, updated_at = now()
  WHERE id = p_trial_id;

  INSERT INTO teacher_balance (teacher_id, total_minutes, completed_trial_lessons, trial_lessons_minutes)
  VALUES (p_teacher_id, v_duration_minutes, 1, v_duration_minutes)
  ON CONFLICT (teacher_id) DO UPDATE SET
    total_minutes = teacher_balance.total_minutes + v_duration_minutes,
    completed_trial_lessons = teacher_balance.completed_trial_lessons + 1,
    trial_lessons_minutes = teacher_balance.trial_lessons_minutes + v_duration_minutes,
    updated_at = now();

  INSERT INTO balance_events (teacher_id, event_type, amount_minutes)
  VALUES (p_teacher_id, 'trial_complete', v_duration_minutes);

  RETURN json_build_object('success', true, 'duration_minutes', v_duration_minutes);
END;
$$;
