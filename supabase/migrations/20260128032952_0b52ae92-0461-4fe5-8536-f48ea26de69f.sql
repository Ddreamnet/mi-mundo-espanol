-- ============================================================================
-- LESSON-NOTES STORAGE BUCKET POLİTİKALARINI DÜZELT
-- Mevcut zayıf politikaları kaldır ve güvenli politikalar ekle
-- Folder yapısı: {student_id}/{teacher_id}/filename
-- ============================================================================

-- 1. MEVCUT POLİTİKALARI KALDIR
DROP POLICY IF EXISTS "Allow authenticated uploads to lesson-notes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from lesson-notes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from lesson-notes" ON storage.objects;
DROP POLICY IF EXISTS "lesson-notes-insert-policy" ON storage.objects;
DROP POLICY IF EXISTS "lesson-notes-select-policy" ON storage.objects;
DROP POLICY IF EXISTS "lesson-notes-delete-policy" ON storage.objects;

-- 2. YENİ GÜVENLİ POLİTİKALAR EKLE

-- Öğretmen kendi öğrencilerinin klasörüne yükleyebilir
CREATE POLICY "Teachers can upload to student lesson-notes folders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-notes' AND
  (storage.foldername(name))[2] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.teacher_id = auth.uid()
    AND s.student_id::text = (storage.foldername(name))[1]
  )
);

-- Öğretmen kendi yüklediği dosyaları görebilir
CREATE POLICY "Teachers can view own uploaded lesson-notes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lesson-notes' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Öğrenci kendi klasöründeki dosyaları görebilir
CREATE POLICY "Students can view own lesson-notes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lesson-notes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Öğretmen kendi yüklediğini silebilir
CREATE POLICY "Teachers can delete own lesson-notes uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lesson-notes' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Admin tam erişim
CREATE POLICY "Admins full access lesson-notes"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'lesson-notes' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'lesson-notes' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);