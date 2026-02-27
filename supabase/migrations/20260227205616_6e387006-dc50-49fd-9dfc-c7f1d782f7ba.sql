
-- Phase 1: Create lesson_instances table
CREATE TABLE public.lesson_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  lesson_number integer NOT NULL,
  lesson_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  original_date date,
  original_start_time time,
  original_end_time time,
  rescheduled_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, teacher_id, lesson_number)
);

-- Indexes
CREATE INDEX idx_lesson_instances_teacher_date
  ON public.lesson_instances (teacher_id, lesson_date, start_time, end_time);

CREATE INDEX idx_lesson_instances_student
  ON public.lesson_instances (student_id, teacher_id, status);

-- Enable RLS
ALTER TABLE public.lesson_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "admin_full_access_lesson_instances"
  ON public.lesson_instances FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "teacher_manage_own_lesson_instances"
  ON public.lesson_instances FOR ALL
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "student_view_own_lesson_instances"
  ON public.lesson_instances FOR SELECT
  USING (student_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_lesson_instances_updated_at
  BEFORE UPDATE ON public.lesson_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Data migration: populate lesson_instances from existing student_lesson_tracking + student_lessons
DO $$
DECLARE
  tracking_row RECORD;
  lesson_num INTEGER;
  lesson_date_val DATE;
  day_of_week_val INTEGER;
  slot_row RECORD;
BEGIN
  FOR tracking_row IN
    SELECT slt.student_id, slt.teacher_id, slt.lesson_dates, slt.completed_lessons
    FROM public.student_lesson_tracking slt
    WHERE slt.lesson_dates IS NOT NULL AND slt.lesson_dates != '{}'::jsonb
  LOOP
    -- Iterate through each lesson number in lesson_dates JSON
    FOR lesson_num, lesson_date_val IN
      SELECT (kv.key)::integer, (kv.value #>> '{}')::date
      FROM jsonb_each(tracking_row.lesson_dates) kv
    LOOP
      -- Get the day_of_week (0=Sun, 1=Mon, ..., 6=Sat) from the date
      -- PostgreSQL EXTRACT(DOW) returns 0=Sunday, but our system uses 0=Sunday too
      day_of_week_val := EXTRACT(DOW FROM lesson_date_val)::integer;

      -- Find matching template slot
      SELECT sl.start_time, sl.end_time INTO slot_row
      FROM public.student_lessons sl
      WHERE sl.student_id = tracking_row.student_id
        AND sl.teacher_id = tracking_row.teacher_id
        AND sl.day_of_week = day_of_week_val
      LIMIT 1;

      -- If no template slot found for that day, try any slot for this student
      IF slot_row IS NULL THEN
        SELECT sl.start_time, sl.end_time INTO slot_row
        FROM public.student_lessons sl
        WHERE sl.student_id = tracking_row.student_id
          AND sl.teacher_id = tracking_row.teacher_id
        LIMIT 1;
      END IF;

      -- Skip if still no slot found
      IF slot_row IS NULL THEN
        CONTINUE;
      END IF;

      INSERT INTO public.lesson_instances (
        student_id, teacher_id, lesson_number, lesson_date,
        start_time, end_time, status
      )
      VALUES (
        tracking_row.student_id,
        tracking_row.teacher_id,
        lesson_num,
        lesson_date_val,
        slot_row.start_time,
        slot_row.end_time,
        CASE
          WHEN tracking_row.completed_lessons IS NOT NULL
               AND lesson_num = ANY(tracking_row.completed_lessons)
          THEN 'completed'
          ELSE 'planned'
        END
      )
      ON CONFLICT (student_id, teacher_id, lesson_number) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;
