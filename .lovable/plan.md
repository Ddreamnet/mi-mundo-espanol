

# Phase 1-6 Test Raporu: Bulunan Eksiklikler

## Durum: 5 sorun tespit edildi

---

### Sorun 1: `lessonSync.ts` hala `rebuildLegacyLessonDatesFromInstances` fonksiyonunu barındırıyor
- Plan Phase 6'da bu fonksiyonun kaldırılması ve sadece `checkNonTemplateWeekday`'in kalması gerekiyordu
- Fonksiyon hala dosyada mevcut ama hiçbir yerden import edilmiyor (ölü kod)
- **Aksiyon**: `rebuildLegacyLessonDatesFromInstances` fonksiyonunu sil, sadece `checkNonTemplateWeekday` kalsın

### Sorun 2: `cleanup-lesson-overrides` edge function hala `lesson_overrides` tablosuna referans veriyor
- Bu edge function artık gereksiz (lesson_overrides tablosu Phase 7'de DROP edilecek, ama kod artık override kullanmıyor)
- `supabase/config.toml`'da da kayıtlı
- **Aksiyon**: Edge function'ı sil, config.toml'dan kaldır

### Sorun 3: `create-student` edge function legacy `completed_lessons: []` ve `lesson_dates: {}` insert ediyor
- Satır 171-174: Yeni öğrenci oluşturulurken eski alan değerleri set ediliyor
- `package_cycle: 1` eklenmesi gerekiyor
- **Aksiyon**: `package_cycle: 1` ekle (legacy alanlar Phase 7'ye kadar kalabilir ama cycle olmalı)

### Sorun 4: `EditStudentDialog.tsx` yeni tracking kaydı oluştururken legacy alanları set ediyor ama bu Phase 7'ye kadar normal
- Satır 560-564: `completed_lessons: []`, `lesson_dates: {}`, `package_cycle: 1` — bu kabul edilebilir, Phase 7'ye kadar uyumluluk için kalmalı
- **Durum**: Sorun değil (legacy compat)

### Sorun 5: `lessonDateCalculation.ts` ve `LessonDates` tipi artık kullanılmıyor
- `calculateLessonDates` ve `calculateLessonDatesFromPoint` fonksiyonları yalnızca `lessonDateUtils.ts` tarafından re-export ediliyor
- Hiçbir component bunları doğrudan kullanmıyor (instance-tabanlı sisteme geçildi)
- **Aksiyon**: `lessonDateCalculation.ts` dosyasını sil, `lessonDateUtils.ts`'den re-export'u kaldır, `LessonDates` tipini `lessonTypes.ts` ve `types/lessons.ts`'den kaldır

---

### Temiz olan alanlar (sorun yok):
- `lessonSorting.ts` — silinmiş, referans yok
- `useLessonOverrides.ts` — silinmiş, referans yok
- `LessonTracker.tsx` — instance-tabanlı, RPC kullanıyor
- `StudentLessonTracker.tsx` — instance-tabanlı, real-time subscription
- `EditStudentDialog.tsx` — RPC kullanıyor, cycle-aware
- `LessonOverrideDialog.tsx` — instance-only güncelleme
- `AdminWeeklySchedule.tsx` — override referansları temiz
- `cancelled` / `isCancelled` — sadece `types.ts` (auto-generated) ve `lesson_overrides` tablosu (DB'de hala var, Phase 7'de DROP)
- `lessonService.ts` — mevcut ve düzgün çalışıyor
- RPC fonksiyonları — DB'de mevcut ve doğru

---

## Yapılacak Değişiklikler (3 dosya düzenleme + 1 silme)

1. **`src/lib/lessonSync.ts`**: `rebuildLegacyLessonDatesFromInstances` fonksiyonunu sil
2. **`src/lib/lessonDateCalculation.ts`**: Dosyayı sil (artık kullanılmıyor)
3. **`src/utils/lessonDateUtils.ts`**: `calculateLessonDates` re-export'unu kaldır
4. **`src/lib/lessonTypes.ts`** ve **`src/types/lessons.ts`**: `LessonDates` interface'ini kaldır
5. **`supabase/functions/cleanup-lesson-overrides/`**: Edge function'ı sil
6. **`supabase/config.toml`**: `cleanup-lesson-overrides` girişini kaldır
7. **`supabase/functions/create-student/index.ts`**: `package_cycle: 1` ekle

