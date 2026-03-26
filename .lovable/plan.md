

# EWD → MME Hizalama Sonrası Detaylı Audit Raporu

## 1. Genel Audit Özeti

Uygulama sonrası sistem **%85-90 eşitlenmiş** durumda. Çekirdek scheduling/balance/chain mantığı EWD ile aynı çalışıyor. Ancak **6 sorun grubu** tespit edildi — bunların çoğu dead code / hardcoded string / küçük tutarsızlık seviyesinde, ama birkaçı ileride bug riski taşıyor.

---

## 2. Kod Referans Audit'i — Bulunan Sorunlar

### Sorun 1: `syncTemplateChange()` dead code (KRİTİK DEĞİL ama temizlenmeli)
- **Dosya**: `src/lib/instanceGeneration.ts` (satır 123-220)
- `syncTemplateChange()` fonksiyonu hala dosyada mevcut ama **hiçbir yerden import/call edilmiyor**
- `useEditStudentDialog` artık `rpc_sync_student_schedule` RPC kullanıyor
- **Aksiyon**: Fonksiyonu sil (dead code)

### Sorun 2: `DAYS_OF_WEEK` hardcoded Türkçe, hiçbir yerden kullanılmıyor
- **Dosya**: `src/lib/types.ts` (satır 104-112)
- `DAYS_OF_WEEK` const tanımlı ama **hiçbir component import etmiyor** (search sonucu: sadece tanım dosyasında match)
- `EditStudentDialog` i18n `t("days.monday")` kullanıyor, `TeacherDashboard` kendi `daysOfWeek` array'ini oluşturuyor, `AdminStudentsTab` da kendi `daysOfWeek`'ünü oluşturuyor
- **Aksiyon**: `DAYS_OF_WEEK`'i sil (dead code) veya tüm component'lerde i18n'den gelen `t("days.*")` kullanılıyorsa gereksiz

### Sorun 3: `getDayName()` hardcoded Türkçe, i18n ile uyumsuz
- **Dosya**: `src/lib/lessonTypes.ts` (satır 66-69)
- Hardcoded `["Pazar", "Pazartesi", ...]` array
- Bu fonksiyon **doğrudan kullanılmıyor** — `TeacherDashboard` ve `AdminStudentsTab` kendi i18n versiyonlarını oluşturuyor
- `lessonSync.ts` (satır 58-59) de aynı hardcoded Türkçe `dayNames` array kullanıyor
- **Aksiyon**: `getDayName`'i sil (dead code). `lessonSync.ts`'deki `dayNames`'i şimdilik bırak (i18n context olmayan pure function, ama ileride i18n'e geçirilebilir)

### Sorun 4: Hardcoded Türkçe stringler birçok yerde
- `useScheduleGrid.ts` satır 411: `"Bilinmeyen"` (student name fallback)
- `AdminWeeklySchedule.tsx` satır 169: `"Bilinmeyen"`
- `WeeklyScheduleDialog.tsx` satır 146: `"Bilinmeyen"`
- `conflictDetection.ts` satır 79: `"Bilinmeyen Öğrenci"`
- Bu dosyaların bazıları (useScheduleGrid, conflictDetection) pure utility olduğu için i18n context yok — ama en azından `"Unknown"` gibi dilden bağımsız bir fallback kullanılabilir veya dışarıdan parametre olarak alınabilir
- **Aksiyon**: Düşük öncelik — fonksiyonel sorun yaratmıyor ama i18n standardına uymuyor

### Sorun 5: `StudentLessonSchedule` type `_hasOverride`, `_originalStartTime`, `_originalEndTime` alanları
- **Dosya**: `src/lib/types.ts` (satır 30-32)
- Bu alanlar `AdminWeeklySchedule`'da actual→synthetic mapping için kullanılıyor (satır 190-194)
- Fonksiyonel olarak doğru çalışıyor, sorun yok — sadece override-era isimlendirme kalıntısı
- **Aksiyon**: Yok (fonksiyonel, isimlendirme kozmetik)

---

## 3. EWD vs MME Çekirdek Mantık Farkları

### Tamamen eşitlenmiş (sorun yok):
- `lessonService.ts` — tüm RPC'ler (complete, undo, reset, archive, delete, restore, undoTrial, completeTrialLesson, manualBalanceAdjust)
- `useEditStudentDialog.ts` — chain control (forward/backward/realign), batch date update, rights validation, `rpc_sync_student_schedule`
- `LessonTracker.tsx` — optimistic updates, preloadedCycle, nextCompletableId/lastCompletedId
- `StudentLessonTracker.tsx` — instance-based, real-time subscription, LessonInstance typed
- `LessonOverrideDialog.tsx` — one-time change, shift forward, batch revert via shift_group_id, is_manual_override
- `EditStudentDialog.tsx` — thin wrapper + hook pattern
- `useScheduleGrid.ts` — week cache, ghost entries, batch queries, ensureInstancesForWeek
- `AdminWeeklySchedule.tsx` — week navigation, actual mode, RPC trial complete/undo
- `WeeklyScheduleDialog.tsx` — week navigation, actual mode
- DB: `shift_group_id`, `is_manual_override` kolonları
- DB: `rpc_sync_student_schedule`, `rpc_undo_trial_lesson`
- `conflictDetection.ts` — interval-based overlap, `checkTeacherConflictsBatch` kaldırılmış
- `teacherBalance.ts` — silinmiş (tüm balance RPC'de)
- `lessonSorting.ts`, `useLessonOverrides.ts` — silinmiş

### Kalan minor farklar:
1. `syncTemplateChange` dead code hala `instanceGeneration.ts`'de (EWD'de de var mı bilmiyorum ama MME'de artık kullanılmıyor)
2. `lessonSync.ts`'deki `calculateNextLessonDate` fonksiyonu + `LessonOverrideDialog`'daki inline `calculateNextLessonDate` — iki ayrı kopya var (satır 13-31 ve satır 130-153). LessonOverrideDialog kendi inline versiyonunu kullanıyor, `lessonSync.ts`'deki hiçbir yerden import edilmiyor. **Dead code**.

---

## 4. Performans Farkı

### EWD'den geçen hızlandırmalar (tamamlanmış):
- Week cache + stale-while-revalidate (`useScheduleGrid.ts`)
- `prefetchWeek` — önceki/sonraki hafta prefetch
- Batch queries (`ensureInstancesForWeek` — N+1 yok)
- Ghost entries (cycle dolmuş öğrenciler görünür kalıyor)
- `clearWeekCache()` mutation sonrası çağrılıyor (tüm write path'lerde)
- LessonTracker: `preloadedCycle` ile extra query azaltma
- Parallel Promise.all kullanımı (initializeDialog, loadData vb.)

### Hala potansiyel darboğaz:
- `LessonOverrideDialog` revert: `shift_group_id` batch revert **sequential** yapılıyor (satır 344-358, for loop içinde `await`). Promise.all ile paralel olabilir.
- `AdminWeeklySchedule` template mode'da (`showTemplate=true`) actual schedule fetch edilmiyor — doğru davranış.

---

## 5. DB / RLS / Tablo / RPC Farkları

### Tam eşitlenmiş:
- `lesson_instances` tablosu: `shift_group_id`, `is_manual_override` mevcut
- Tüm RPC'ler: `rpc_complete_lesson`, `rpc_undo_complete_lesson`, `rpc_reset_package`, `rpc_archive_student`, `rpc_delete_student`, `rpc_restore_student`, `rpc_complete_trial_lesson`, `rpc_undo_trial_lesson`, `rpc_sync_student_schedule`, `rpc_manual_balance_adjust`
- RLS policy'ler: instance tablosu üzerinde teacher/student/admin erişimi doğru
- `balance_events` tablosu: audit trail mevcut
- `notify_admin_last_lesson` trigger: instance-based, cycle-aware

### Kalan DB kalıntıları (Phase 7 scope):
- `lesson_overrides` tablosu: DB'de hala var, `types.ts`'de (auto-generated) referansı var — bu beklenen, Phase 7'de DROP edilecek
- `student_lesson_tracking.completed_lessons` ve `lesson_dates` alanları: hala var, RPC'ler legacy compat olarak güncelliyor — Phase 7'de kaldırılacak

---

## 6. Truth Source / Koordinasyon Analizi

### Tek truth source (doğru):
- Ders durumu → `lesson_instances.status`
- Ders tarihi/saati → `lesson_instances.lesson_date` + `start_time`
- Cycle → `student_lesson_tracking.package_cycle`
- Template → `student_lessons` tablosu
- Balance → `teacher_balance` + `balance_events` (RPC atomik)

### Potansiyel koordinasyon riski:
- `EditStudentDialog` hook'u `rpc_sync_student_schedule` çağrısı sırasında `clearWeekCache()` yapıyor — doğru
- `LessonOverrideDialog` one-time change sonrası `onSuccess()` callback ile parent refresh tetikliyor ama `clearWeekCache()` çağırmıyor. Parent (`AdminWeeklySchedule`) `handleOverrideSuccess`'te schedule'ı yeniden fetch ediyor ama cache temizliği parent'ta mı yapılıyor?

---

## 7. Cleanup / Eşitleme Planı

### Yüksek Öncelik (dead code temizliği):
1. **`instanceGeneration.ts`**: `syncTemplateChange()` fonksiyonunu sil — artık kullanılmıyor, `rpc_sync_student_schedule` yerini aldı
2. **`lessonSync.ts`**: `calculateNextLessonDate()` fonksiyonunu sil — `LessonOverrideDialog` kendi inline versiyonunu kullanıyor
3. **`lessonTypes.ts`**: `getDayName()` fonksiyonunu sil — hiçbir yerden kullanılmıyor
4. **`types.ts`**: `DAYS_OF_WEEK` const'u sil — hiçbir yerden import edilmiyor

### Düşük Öncelik (i18n standardizasyonu):
5. `useScheduleGrid.ts`, `AdminWeeklySchedule.tsx`, `WeeklyScheduleDialog.tsx`, `conflictDetection.ts`: `"Bilinmeyen"` / `"Bilinmeyen Öğrenci"` hardcoded string'leri — fonksiyonel sorun yok ama i18n standardına uymuyor

### Mikro Optimizasyon:
6. `LessonOverrideDialog.tsx` satır 344-358: Shift group batch revert sequential → parallel (`Promise.all`)

---

## 8. Son Karar

### Tam eşitlenmiş ve güvenli:
- Ders işlendi / geri alma (RPC)
- Balance / balance_events / teacher_balance (tamamen RPC-tabanlı)
- Shift / revert / next lesson / one-time change / shift_group_id batch revert
- Reset package / restore / archive / delete
- Template sync (rpc_sync_student_schedule)
- Planned/completed instance mantığı
- Chain control (forward/backward/realign)
- Ghost / schedule grid / week navigation / caching
- EditStudentDialog + hook pattern
- LessonTracker + StudentLessonTracker
- Tüm DB RPC'ler ve RLS policy'ler

### Kısmen eşitlenmiş (cleanup gerekli ama fonksiyonel sorun yok):
- Dead code: `syncTemplateChange`, `calculateNextLessonDate` (lessonSync), `getDayName`, `DAYS_OF_WEEK`
- Hardcoded Türkçe fallback stringler (i18n dışı)
- `LessonOverrideDialog` batch revert sequential (performans mikro-issue)

### Phase 7 scope (bilinçli olarak bekletiliyor):
- `lesson_overrides` tablosu DROP
- `completed_lessons[]` ve `lesson_dates{}` legacy alanları DROP
- `types.ts` auto-generated referanslar otomatik temizlenecek

### Öncelikli sonraki adımlar:
1. Dead code temizliği (4 fonksiyon/const silme — 5 dakika, sıfır risk)
2. `LessonOverrideDialog` batch revert parallelization (mikro optimizasyon)
3. Phase 7 Legacy DROP (stabil olduğu doğrulandıktan sonra)

