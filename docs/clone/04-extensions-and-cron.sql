-- ============================================================================
-- MI MUNDO ESPAÑOL - EXTENSIONS VE CRON JOB
-- Bu SQL, 03-storage-setup.sql'den SONRA çalıştırılmalıdır
-- ============================================================================

-- ============================================================================
-- 1. EXTENSION'LARI AKTİFLEŞTİR
-- ============================================================================
-- NOT: Bu extension'lar Supabase Dashboard → Database → Extensions'dan
-- manuel olarak da aktifleştirilebilir

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- 2. CRON JOB OLUŞTUR
-- ============================================================================
-- ÖNEMLİ: Aşağıdaki URL ve Authorization token'ı YENİ projenizin
-- bilgileriyle DEĞİŞTİRMENİZ GEREKİYOR!
--
-- Değiştirilecek yerler:
-- 1. url: 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/...'
-- 2. Authorization Bearer: 'YOUR_ANON_KEY'
-- ============================================================================

-- CRON JOB 1: Lesson Override'ları günlük temizle (saat 01:00)
-- SELECT cron.schedule(
--   'cleanup-lesson-overrides-daily',
--   '0 1 * * *',
--   $$
--   SELECT net.http_post(
--     url:='https://YOUR_PROJECT_ID.supabase.co/functions/v1/cleanup-lesson-overrides',
--     headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
--     body:='{}'::jsonb
--   ) as request_id;
--   $$
-- );

-- CRON JOB 2: Deneme Derslerini günlük temizle (saat 02:00)
-- SELECT cron.schedule(
--   'cleanup-trial-lessons-daily',
--   '0 2 * * *',
--   $$
--   SELECT net.http_post(
--     url:='https://YOUR_PROJECT_ID.supabase.co/functions/v1/cleanup-trial-lessons',
--     headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
--     body:='{}'::jsonb
--   ) as request_id;
--   $$
-- );

-- ============================================================================
-- MEVCUT PROJE İÇİN GERÇEK DEĞERLER:
-- ============================================================================

-- Lesson Overrides Cleanup (zaten aktif)
-- SELECT cron.schedule(
--   'cleanup-lesson-overrides-daily',
--   '0 1 * * *',
--   $$
--   SELECT net.http_post(
--     url:='https://miyioionvpkhndrsrnel.supabase.co/functions/v1/cleanup-lesson-overrides',
--     headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peWlvaW9udnBraG5kcnNybmVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTk5MjgsImV4cCI6MjA4MTUzNTkyOH0.HSI3ynHemdN3_-UauRMqxcrf61LaUmkPM1IxE9kFKYk"}'::jsonb,
--     body:='{}'::jsonb
--   ) as request_id;
--   $$
-- );

-- Trial Lessons Cleanup (EKLENMELİ)
-- SELECT cron.schedule(
--   'cleanup-trial-lessons-daily',
--   '0 2 * * *',
--   $$
--   SELECT net.http_post(
--     url:='https://miyioionvpkhndrsrnel.supabase.co/functions/v1/cleanup-trial-lessons',
--     headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peWlvaW9udnBraG5kcnNybmVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTk5MjgsImV4cCI6MjA4MTUzNTkyOH0.HSI3ynHemdN3_-UauRMqxcrf61LaUmkPM1IxE9kFKYk"}'::jsonb,
--     body:='{}'::jsonb
--   ) as request_id;
--   $$
-- );
