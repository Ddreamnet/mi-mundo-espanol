-- Add missing foreign key constraints for students table
ALTER TABLE public.students
ADD CONSTRAINT students_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.students
ADD CONSTRAINT students_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add missing foreign key constraints for topics table
ALTER TABLE public.topics
ADD CONSTRAINT topics_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.topics
ADD CONSTRAINT topics_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;