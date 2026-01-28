-- ============================================================================
-- DERS NOTLARI TABLOSU
-- ============================================================================
-- Öğretmenlerin öğrencileriyle paylaştığı ders notlarını saklar.

CREATE TABLE public.lesson_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexler
CREATE INDEX idx_lesson_notes_student_id ON public.lesson_notes(student_id);
CREATE INDEX idx_lesson_notes_teacher_id ON public.lesson_notes(teacher_id);
CREATE INDEX idx_lesson_notes_batch_id ON public.lesson_notes(batch_id);

-- Updated at trigger
CREATE TRIGGER update_lesson_notes_updated_at
  BEFORE UPDATE ON public.lesson_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RLS POLİTİKALARI
-- ============================================================================

ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

-- Öğretmenler kendi ders notlarını görebilir
CREATE POLICY "Teachers can view their own lesson notes"
  ON public.lesson_notes
  FOR SELECT
  USING (auth.uid() = teacher_id);

-- Öğrenciler kendilerine gönderilen ders notlarını görebilir
CREATE POLICY "Students can view lesson notes sent to them"
  ON public.lesson_notes
  FOR SELECT
  USING (auth.uid() = student_id);

-- Sadece öğretmenler ders notu ekleyebilir
CREATE POLICY "Teachers can insert lesson notes"
  ON public.lesson_notes
  FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Sadece öğretmenler kendi ders notlarını güncelleyebilir
CREATE POLICY "Teachers can update their own lesson notes"
  ON public.lesson_notes
  FOR UPDATE
  USING (auth.uid() = teacher_id);

-- Sadece öğretmenler kendi ders notlarını silebilir
CREATE POLICY "Teachers can delete their own lesson notes"
  ON public.lesson_notes
  FOR DELETE
  USING (auth.uid() = teacher_id);

-- ============================================================================
-- STORAGE BUCKET - lesson-notes
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-notes', 'lesson-notes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Teachers can upload lesson notes"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'lesson-notes' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view their lesson notes"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'lesson-notes' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Teachers can delete lesson notes"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'lesson-notes' AND
    auth.role() = 'authenticated'
  );