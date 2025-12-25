-- Öğretmenlerin kendi öğrencilerinin lesson_link alanını güncelleyebilmesi için politika
CREATE POLICY "teacher_update_own_students" ON public.students
FOR UPDATE TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());