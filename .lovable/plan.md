

# EWD → MME Karşılaştırmalı Analiz ve Hizalama Planı

## 1. Genel Karşılaştırma Özeti

| Alan | EWD (Kaynak) | MME (Hedef) | Fark Seviyesi |
|---|---|---|---|
| EditStudentDialog | Hook-tabanlı (`useEditStudentDialog.ts` + thin UI) | Monolitik 1007-satır component | **KRİTİK** |
| instanceGeneration.ts | `afterTime` parametresi, `getSlotBefore()`, `shift_group_id`, `is_manual_override` | Basit versiyon, afterTime yok, getSlotBefore yok | **KRİTİK** |
| lessonService.ts | `undoTrialLesson`, `preloadedCycle` parametresi | Bunlar yok | **ORTA** |
| useScheduleGrid.ts | Hafta navigasyonu, caching (weekCache), ghost entries, batch queries | Tek hafta, N+1 queries, ghost yok | **KRİTİK** |
| conflictDetection.ts | Tekil fonksiyon | Ekstra `checkTeacherConflictsBatch` var (gereksiz) | **DÜŞÜK** |
| LessonOverrideDialog | `shift_group_id` batch revert, `is_manual_override` | Tekil revert, `shift_group_id` yok | **KRİTİK** |
| teacherBalance.ts | Yok (RPC'de atomik) | Client-side balance fonksiyonları hala var | **ORTA** |
| lessonSync.ts | EWD'de `lessonDateCalculation.ts` (richer API) | Basit toast-only `checkNonTemplateWeekday` | **DÜŞÜK** |
| DB: `shift_group_id` column | Var | **YOK** | **KRİTİK** |
| DB: `is_manual_override` column | Var | **YOK** | **KRİTİK** |
| DB: `rpc_sync_student_schedule` | Var (atomic template change RPC) | **YOK** (client-side sync) | **KRİTİK** |
| DB: `rpc_undo_trial_lesson` | Var | **YOK** (client-side balance) | **ORTA** |
| LessonTracker.tsx | Optimistic updates, preloadedCycle | Full refetch after each action | **ORTA** |
| AdminWeeklySchedule | Week navigation, ScheduleGridCell, RPC trial complete/undo | Current week only, client-side trial balance | **KRİTİK** |
| WeeklyScheduleDialog | Week navigation, ghost entries, caching | Current week only, no ghost | **KRİTİK** |

### Tasarımsal farklar (DOKUNULMAYACAK):
- MME'nin i18n yapısı (react-i18next, Türkçe/İngilizce/İspanyolca)
- Renk paleti, spacing, component stilleri
- `LanguageContext`, `useLanguage` hook'u
- MME'ye özel zoom linki, global topic kategorileri
- MME'nin `BookCheck` icon kullanımı (StudentLessonTracker)

---

## 2. Katman Katman Fark Analizi

### A. Frontend Component/Hook/Helper Farkları

| Dosya | EWD | MME | Gerekli Değişiklik |
|---|---|---|---|
| `EditStudentDialog.tsx` | Thin UI wrapper, hook'tan state alıyor | 1007 satır monolitik component | Hook'a ayır (EWD pattern) |
| `useEditStudentDialog.ts` | 929 satır: chain control (forward/backward/realign), batch date update, `rpc_sync_student_schedule`, `handleLessonsPerWeekChange` validation | **DOSYA YOK** | EWD'den oluştur, i18n ekle |
| `instanceGeneration.ts` | `afterTime` param, `getSlotBefore()`, `shift_group_id` support, date-fns kullanıyor | Basit versiyon, afterTime yok, getSlotBefore yok, native Date | EWD versiyonunu al |
| `useScheduleGrid.ts` | 574 satır: week cache, prefetch, ghost entries, batch queries, exported utilities | 393 satır: tek hafta, N+1 queries, renk ataması | EWD versiyonunu al, MME'nin renk array'ini koru |
| `LessonOverrideDialog.tsx` | `shift_group_id` batch revert, `is_manual_override`, conflict display | Tekil revert, conflict block (EWD'de warning-only) | EWD versiyonunu al, i18n koru |
| `LessonTracker.tsx` | Optimistic updates, `preloadedCycle`, `nextCompletableId`/`lastCompletedId` state | Full refetch, inline state derivation | EWD versiyonunu al, i18n koru |
| `StudentLessonTracker.tsx` | Minimal, `LessonInstance` typed | Custom `InstanceData` interface | EWD pattern'e hizala |
| `AdminWeeklySchedule.tsx` | Week navigation, `ScheduleGridCell`, `completeTrialLesson`/`undoTrialLesson` RPC | Tek hafta, client-side trial balance | EWD pattern'e hizala |
| `WeeklyScheduleDialog.tsx` | Week navigation, ghost entries, caching | Tek hafta | EWD pattern'e hizala |
| `teacherBalance.ts` | EWD'de **dosya yok** (tüm balance RPC'de) | Client-side add/subtract fonksiyonları | **SİL** (trial flow hariç, onlar da RPC'ye geçecek) |
| `lessonSync.ts` | EWD'de `lessonDateCalculation.ts` (richer: returns `{ isNonTemplate, templateDays }`) | Toast-only boolean return | EWD API'sine hizala |
| `lessonTypes.ts` | `is_manual_override`, `shift_group_id` fields | Bu alanlar yok | EWD versiyonuna güncelle |
| `ScheduleGridCell.tsx` | **EWD'de VAR** (ayrı component) | **MME'de YOK** | EWD'den kopyala, i18n ekle |
| `src/lib/types.ts` | `StudentLessonBase`, `DAYS_OF_WEEK`, diğer shared types | **MME'de YOK** (inline tanımlar) | EWD'den oluştur, i18n uyumlu |

### B. SQL/RPC/Function Farkları

| RPC | EWD | MME | Gerekli |
|---|---|---|---|
| `rpc_sync_student_schedule` | Atomic: delete+regenerate planned, preserve manual overrides, update tracking | **YOK** — client-side `syncTemplateChange` | Migration ile oluştur |
| `rpc_undo_trial_lesson` | Atomic: undo trial + balance - balance_event | **YOK** — client-side balance | Migration ile oluştur |
| `rpc_complete_lesson` | Var, aynı | Var, aynı | OK |
| `rpc_undo_complete_lesson` | Var, aynı | Var, aynı | OK |
| `rpc_reset_package` | Var, aynı | Var, aynı | OK |
| `rpc_archive_student` | Var, aynı | Var, `lesson_overrides` DELETE satırı var | Cleanup: `lesson_overrides` DELETE'i kaldır |
| `rpc_delete_student` | Var, aynı | Var, `lesson_overrides` DELETE satırı var | Cleanup: `lesson_overrides` DELETE'i kaldır |
| `rpc_restore_student` | Var, benzer | Var, benzer | MAX lesson_number fix kontrolü |
| `rpc_manual_balance_adjust` | Var, aynı | Var, aynı | OK |
| `rpc_complete_trial_lesson` | Var, aynı | Var, aynı | OK |

### C. Tablo/Alan Farkları

| Tablo/Alan | EWD | MME |
|---|---|---|
| `lesson_instances.shift_group_id` | uuid, nullable | **YOK** |
| `lesson_instances.is_manual_override` | boolean, default false | **YOK** |
| `lesson_overrides` tablosu | Phase 7'de DROP edilecek (kod referansı yok) | Hala var, `rpc_archive/delete_student`'da referans var |

### D. RLS Policy Farkları

RLS policy'ler zaten aynı görünüyor. Yeni kolonlar eklendikten sonra ek policy gerekmez.

### E. Veri Akışı Farkları

**EWD**: `EditStudentDialog` → `useEditStudentDialog` hook → `rpc_sync_student_schedule` (template change) veya `batchUpdateInstances` (date change) → `clearWeekCache`

**MME**: `EditStudentDialog` → inline `syncTemplateChange` (client-side delete+regenerate) → sequential updates → cache yok

**EWD trial complete**: `AdminWeeklySchedule` → `completeTrialLesson` RPC → atomic balance + event

**MME trial complete**: `AdminWeeklySchedule` → `addTrialLessonToBalance` (client-side) → no balance_event

---

## 3. Aynılaştırılması Gerekenler

### Birebir EWD'den alınacak dosyalar (i18n adaptasyonuyla):
1. `src/lib/instanceGeneration.ts` — tam kopya (date-fns, afterTime, getSlotBefore, shift_group_id)
2. `src/hooks/useEditStudentDialog.ts` — yeni dosya oluştur (EWD'den, i18n ekle)
3. `src/lib/types.ts` — yeni dosya oluştur (i18n'li DAYS_OF_WEEK adaptasyonu)

### Selective merge gereken dosyalar:
4. `src/components/EditStudentDialog.tsx` — EWD pattern: thin UI wrapper + hook (MME'nin i18n/tasarım korunur)
5. `src/hooks/useScheduleGrid.ts` — EWD caching + ghost + batch logic (MME'nin renk array'i korunur)
6. `src/components/LessonOverrideDialog.tsx` — shift_group_id batch revert + is_manual_override (i18n korunur)
7. `src/components/LessonTracker.tsx` — optimistic updates + preloadedCycle (i18n korunur)
8. `src/components/StudentLessonTracker.tsx` — LessonInstance typed (i18n korunur)
9. `src/components/AdminWeeklySchedule.tsx` — week navigation + RPC trial (i18n korunur)
10. `src/components/WeeklyScheduleDialog.tsx` — week navigation + ghost (i18n korunur)
11. `src/lib/lessonService.ts` — `undoTrialLesson` + `preloadedCycle` parametresi ekle
12. `src/lib/lessonTypes.ts` — `is_manual_override`, `shift_group_id` alanları ekle
13. `src/lib/lessonSync.ts` — richer `checkNonTemplateWeekday` (returns object, not boolean)

### Silinecek / refactor edilecek:
14. `src/lib/teacherBalance.ts` — trial fonksiyonlar RPC'ye geçtikten sonra sil
15. `src/lib/conflictDetection.ts` — `checkTeacherConflictsBatch` kaldır (EWD'de paralel Promise.all kullanılıyor)

### SQL/RPC senkronlanacaklar:
16. Migration: `lesson_instances` tablosuna `shift_group_id uuid DEFAULT NULL` ve `is_manual_override boolean DEFAULT false` ekle
17. Migration: `rpc_sync_student_schedule` oluştur (EWD'den birebir)
18. Migration: `rpc_undo_trial_lesson` oluştur (EWD'den birebir)
19. Migration: `rpc_archive_student` güncelle — `lesson_overrides` DELETE satırını kaldır
20. Migration: `rpc_delete_student` güncelle — `lesson_overrides` DELETE satırını kaldır
21. Migration: `rpc_restore_student` güncelle — MAX lesson_number fix

### MME'ye özel kalacak istisnalar:
- `LanguageContext`, `useLanguage`, `useTranslation` kullanımı tüm componentlerde korunur
- `daysOfWeek` array'i i18n'den gelir (EWD'deki hardcoded `DAYS_OF_WEEK` yerine)
- `ScheduleGridCell.tsx` oluşturulursa i18n ile
- Zoom link, global topic kategori özellikleri korunur
- Tasarım farklılıkları (renkler, spacing, icons) korunur

---

## 4. Riskler

| Risk | Seviye | Mitigation |
|---|---|---|
| `rpc_sync_student_schedule` olmadan template kaydetme mantığı farklı çalışıyor | Yüksek | RPC'yi DB'de oluştur, sonra frontend'i geçir |
| `shift_group_id` kolonu olmadan `shiftLessonsForward` batch revert yapamaz | Yüksek | Önce migration, sonra frontend |
| `teacherBalance.ts` silindikten sonra trial complete/undo akışı kırılır | Yüksek | Önce `rpc_undo_trial_lesson` oluştur, sonra sil |
| MME'deki `WeeklyScheduleDialog` ve `AdminWeeklySchedule` haftalar arası navigasyon eklenmesi kapsamlı | Orta | EWD pattern'ini takip et |
| `useEditStudentDialog` hook oluşturulurken MME'ye özel i18n ihtiyaçları | Düşük | EWD'den al, t() fonksiyonları ekle |
| `lessonDateCalculation.ts` EWD'de hala var ama MME'de silinmişti — `LessonOverrideDialog` referans veriyor | Orta | EWD fonksiyonunu `lessonSync.ts`'e ekle veya ayrı dosya oluştur |

---

## 5. Uygulama Planı

### Phase 1: DB/RPC altyapısı (önce)
1. Migration: `shift_group_id` ve `is_manual_override` kolonlarını ekle
2. Migration: `rpc_sync_student_schedule` oluştur
3. Migration: `rpc_undo_trial_lesson` oluştur
4. Migration: `rpc_archive_student` ve `rpc_delete_student` güncelle (lesson_overrides kaldır)
5. Migration: `rpc_restore_student` MAX fix

### Phase 2: Core lib dosyaları
6. `src/lib/instanceGeneration.ts` — EWD versiyonuyla değiştir
7. `src/lib/lessonTypes.ts` — `is_manual_override`, `shift_group_id` ekle
8. `src/lib/lessonService.ts` — `undoTrialLesson`, `preloadedCycle` ekle
9. `src/lib/lessonSync.ts` — richer `checkNonTemplateWeekday` + `calculateNextLessonDate` ekle
10. `src/lib/conflictDetection.ts` — `checkTeacherConflictsBatch` kaldır
11. `src/lib/types.ts` — oluştur (StudentLessonBase vb.)

### Phase 3: Hook'lar
12. `src/hooks/useEditStudentDialog.ts` — EWD'den oluştur (i18n ekle)
13. `src/hooks/useScheduleGrid.ts` — EWD versiyonuyla değiştir (MME renkleri koru)

### Phase 4: Component'ler
14. `src/components/EditStudentDialog.tsx` — thin wrapper + hook pattern
15. `src/components/LessonTracker.tsx` — optimistic updates
16. `src/components/StudentLessonTracker.tsx` — typed instances
17. `src/components/LessonOverrideDialog.tsx` — shift_group_id batch revert
18. `src/components/ScheduleGridCell.tsx` — EWD'den oluştur (i18n)
19. `src/components/AdminWeeklySchedule.tsx` — week nav + RPC trial
20. `src/components/WeeklyScheduleDialog.tsx` — week nav + ghost

### Phase 5: Cleanup
21. `src/lib/teacherBalance.ts` — sil (artık RPC'de)
22. Dangling import temizliği

### Phase 6: Test
- Her phase sonrası fonksiyonel test

---

## 6. Scope Kontrolü

### EWD ile birebir aynı yapılacak:
- `instanceGeneration.ts` (afterTime, getSlotBefore, shift_group_id logic)
- `lessonService.ts` (undoTrialLesson, preloadedCycle)
- Tüm RPC fonksiyonları (sync, undo_trial, archive, delete, restore)
- `useEditStudentDialog` hook mantığı (chain control, batch date update, rights validation)
- `useScheduleGrid` (cache, ghost, batch queries)
- LessonOverrideDialog (shift_group_id batch revert)
- LessonTracker (optimistic updates)
- Balance akışı (tamamen RPC-tabanlı, client-side balance kaldırılacak)

### MME'ye özel kalacak:
- Tüm i18n altyapısı (react-i18next, locale dosyaları, useTranslation)
- `LanguageContext` ve `useLanguage` hook
- Renk paleti ve tasarım (secondary vs primary renk kullanımı)
- Zoom link yönetimi
- Global topic kategorileri
- `BookCheck` icon (StudentLessonTracker)
- Date locale desteği (tr/en/es)

### Tasarım farklarına dokunulmayacak:
- Component stilleri, spacing, border radius
- Icon seçimleri
- Card/layout yapısı
- Renk şeması (MME'nin `secondary` kullanımı vs EWD'nin `primary`)

