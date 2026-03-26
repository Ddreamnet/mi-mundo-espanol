ALTER TABLE public.lesson_instances
  DROP CONSTRAINT IF EXISTS lesson_instances_student_id_teacher_id_lesson_number_key;

ALTER TABLE public.lesson_instances
  ADD CONSTRAINT lesson_instances_student_teacher_lesson_cycle_key
  UNIQUE (student_id, teacher_id, lesson_number, package_cycle);