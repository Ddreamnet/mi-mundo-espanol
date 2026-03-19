
-- Phase 1c: Update notify_admin_last_lesson trigger to use lesson_instances

-- 1. Update the function to fire on lesson_instances status change
CREATE OR REPLACE FUNCTION public.notify_admin_last_lesson()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_lessons INTEGER;
  completed_count INTEGER;
  teacher_name TEXT;
  student_name TEXT;
  v_student_id uuid;
  v_teacher_id uuid;
  v_package_cycle integer;
BEGIN
  -- This trigger fires on lesson_instances update (status change to completed)
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    v_student_id := NEW.student_id;
    v_teacher_id := NEW.teacher_id;
    v_package_cycle := NEW.package_cycle;

    SELECT lessons_per_week * 4 INTO total_lessons
    FROM student_lesson_tracking
    WHERE student_id = v_student_id AND teacher_id = v_teacher_id;

    IF total_lessons IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT count(*) INTO completed_count
    FROM lesson_instances
    WHERE student_id = v_student_id
      AND teacher_id = v_teacher_id
      AND package_cycle = v_package_cycle
      AND status = 'completed';

    IF completed_count = total_lessons - 1 THEN
      SELECT full_name INTO teacher_name FROM profiles WHERE user_id = v_teacher_id;
      SELECT full_name INTO student_name FROM profiles WHERE user_id = v_student_id;

      IF NOT EXISTS (
        SELECT 1 FROM admin_notifications
        WHERE teacher_id = v_teacher_id
        AND student_id = v_student_id
        AND notification_type = 'last_lesson_warning'
        AND created_at > (CURRENT_DATE - INTERVAL '30 days')
      ) THEN
        INSERT INTO admin_notifications (notification_type, teacher_id, student_id, message)
        VALUES (
          'last_lesson_warning',
          v_teacher_id,
          v_student_id,
          COALESCE(teacher_name, 'Öğretmen') || ' öğretmenin ' || COALESCE(student_name, 'Öğrenci') || ' öğrencisinin son bir dersi kaldı!'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Drop old trigger on student_lesson_tracking, create new on lesson_instances
DROP TRIGGER IF EXISTS notify_last_lesson_trigger ON student_lesson_tracking;
DROP TRIGGER IF EXISTS notify_last_lesson_trigger ON lesson_instances;
CREATE TRIGGER notify_last_lesson_trigger
  AFTER UPDATE ON lesson_instances
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_last_lesson();
