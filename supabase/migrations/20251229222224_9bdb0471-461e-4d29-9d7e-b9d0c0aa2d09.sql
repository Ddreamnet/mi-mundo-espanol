-- Murat Yıldız için eksik student_lesson_tracking kaydını oluştur
INSERT INTO student_lesson_tracking (student_id, teacher_id, lessons_per_week, completed_lessons, lesson_dates)
VALUES (
  'bf319951-1d71-40f2-a9fc-1fc6bc1e944d', 
  '2f76fc89-a6cb-4e3b-94be-f33189e4a757', 
  2,
  ARRAY[]::integer[],
  '{}'::jsonb
)
ON CONFLICT DO NOTHING;