

# Mi Mundo Espanol'a EWD Değişikliklerini Aktarma Planı

## 1. Executive Summary

Mi Mundo Espanol (MME), EWD'nin eski bir klonudur ve EWD'de yapılan kritik 7-fazlık mimari dönüşümün HİÇBİRİNİ almamıştır. Temel farklar:

| Alan | EWD (Güncel) | MME (Eski) |
|---|---|---|
| Completion kaynağı | `lesson_instances.status` (tek kaynak) | `completed_lessons[]` JSON array (eski model) |
| Tarih kaynağı | `lesson_instances.lesson_date` (tek kaynak) | `lesson_dates{}` JSON + `lesson_overrides` tablo (ikili kaynak) |
| Cycle desteği | `package_cycle` ile filtreli | Yok — tüm instance'lar tek havuzda |
| Write path | Atomic RPC fonksiyonları (`rpc_complete_lesson`, `rpc_undo_complete_lesson`, vb.) | Client-side multi-step (race condition riski) |
| Balance audit | `balance_events` audit tablosu | Yok |
| Cancel durumu | Kaldırıldı — sadece `planned`/`completed` | `cancelled` hala aktif |
| `lesson_overrides` tablosu | DROP edildi | Hala kullanılıyor |
| Lazy generation | Cycle-aware + cap + date boundary | Cap yok, cycle yok — sınırsız üretim |
| Archive/Delete/Reset | Atomic RPC'ler | Client-side, güvensiz |
| `lessonService.ts` | Var — merkezi write path | Yok |
| `lessonSorting.ts` | Yok (gereksiz oldu) | Var (eski override mantığı) |
| `lessonSync.ts` | Minimal (sadece weekday check) | `rebuildLegacyLessonDatesFromInstances` + legacy sync |

---

## 2. English with Dilara Change Inventory

### 2.1. `package_cycle` sistemi
- **EWD dosyaları**: Tüm query'ler, RPC'ler, `lessonService.ts`, `instanceGeneration.ts`, `useScheduleGrid.ts`
- **Eski**: Cycle konsepti yoktu
- **Yeni**: `student_lesson_tracking.package_cycle` + `lesson_instances.package_cycle` kolonu; tüm okuma/yazma cycle-filtered
- **Neden**: Eski/yeni paket verilerinin karışmasını önlemek
- **MME'ye taşınmalı mı**: EVET — kritik
- **Nasıl**: DB migration + tüm query'lere cycle filter eklenmesi

### 2.2. `completed_lessons[]` ve `lesson_dates{}` JSON alanlarının DROP edilmesi
- **EWD dosyaları**: `student_lesson_tracking` tablosundan fiziksel olarak kaldırıldı
- **Eski**: Bu alanlar source of truth idi
- **Yeni**: `lesson_instances` tablosu tek kaynak
- **Neden**: İkili kaynak → veri tutarsızlığı
- **MME'ye taşınmalı mı**: EVET — kritik
- **Nasıl**: Önce tüm okuma/yazma'yı instance-tabanlıya geçir, sonra DROP

### 2.3. `lesson_overrides` tablosunun DROP edilmesi
- **EWD dosyaları**: Tablo DROP, `lessonSorting.ts` ve `useLessonOverrides.ts` kaldırıldı
- **Eski**: Override'lar ayrı tabloda tutuluyordu
- **Yeni**: Tarih değişiklikleri doğrudan `lesson_instances` üzerinde (`original_date`, `rescheduled_count`)
- **Neden**: İkili kaynak + karmaşıklık
- **MME'ye taşınmalı mı**: EVET — kritik
- **Nasıl**: Override mantığı instance update'e taşınacak, tablo DROP

### 2.4. `cancelled` status'un kaldırılması
- **EWD**: Status sadece `planned` | `completed`
- **MME**: `cancelled` hala aktif (81 match)
- **Neden**: İptal = sil veya ertele, ayrı statüye gerek yok
- **MME'ye taşınmalı mı**: EVET
- **Nasıl**: UI'dan `cancelled` referansları kaldır, `Ban` ikonları temizle

### 2.5. Atomic RPC fonksiyonları
- **EWD dosyaları**: `rpc_complete_lesson`, `rpc_undo_complete_lesson`, `rpc_reset_package`, `rpc_archive_student`, `rpc_delete_student`, `rpc_restore_student`, `rpc_manual_balance_adjust`, `rpc_complete_trial_lesson`
- **MME**: Yok — tümü client-side multi-step
- **Neden**: Race condition, bakiye tutarsızlığı, atomiklik garantisi
- **MME'ye taşınmalı mı**: EVET — kritik
- **Nasıl**: DB migration ile RPC oluştur, `lessonService.ts` oluştur

### 2.6. `balance_events` audit tablosu
- **EWD**: Her bakiye değişikliği audit kaydı bırakır
- **MME**: Yok
- **Neden**: Debug, veri onarımı, izlenebilirlik
- **MME'ye taşınmalı mı**: EVET

### 2.7. `lessonService.ts` — merkezi write path
- **EWD**: Tüm lesson mutasyonları bu dosya üzerinden
- **MME**: Yok — her component kendi DB yazma mantığını içeriyor
- **MME'ye taşınmalı mı**: EVET — kritik

### 2.8. Lazy generation cycle-aware cap
- **EWD `useScheduleGrid.ts`**: `ensureInstancesForWeek` → `totalRights = lpw * 4`, `existingInCycle >= totalRights` check, `lastCompletedDate` boundary
- **MME `useScheduleGrid.ts`**: Cap yok, cycle yok, date boundary yok → sınırsız instance üretimi
- **MME'ye taşınmalı mı**: EVET — kritik (EWD'de bu eksiklik veri şişmesine neden olmuştu)

### 2.9. Template change sync güvenliği
- **EWD `instanceGeneration.ts`**: `syncTemplateChange` → cycle-filtered, completed koruma, cap enforcement
- **MME `instanceGeneration.ts`**: Cycle filtresi yok
- **MME'ye taşınmalı mı**: EVET

### 2.10. Archive/Delete/Reset güvenliği
- **EWD**: Atomic RPC'ler — completed korunur, planned silinir, balance ayarlanır
- **MME**: `handleResetAllLessons` → TÜM instance'ları siler (completed dahil!), bakiye düzeltmesi yok
- **MME'ye taşınmalı mı**: EVET — kritik risk

### 2.11. Tracker'ların instance-tabanlı okunması
- **EWD `LessonTracker.tsx`**: `lesson_instances` + `package_cycle` filtreli, toggle-to-undo, RPC ile complete
- **MME `LessonTracker.tsx`**: `completed_lessons[]` JSON, `lesson_overrides`, `lesson_dates{}` — eski model
- **MME'ye taşınmalı mı**: EVET

### 2.12. `notify_admin_last_lesson` trigger
- **EWD**: `lesson_instances` status change'e bağlı
- **MME**: Muhtemelen eski modele bağlı
- **MME'ye taşınmalı mı**: Trigger'ı instance-tabanlıya güncelle

---

## 3. Current Project (MME) Architecture Map

| Kavram | MME Dosya/Konum | Ne yapıyor | EWD Karşılığı |
|---|---|---|---|
| Weekly template | `student_lessons` tablosu | Haftalık ders şablonu | Aynı |
| Concrete lesson | `lesson_instances` tablosu | Somut ders kaydı | Aynı tablo, ama cycle yok |
| Tracking/cache | `student_lesson_tracking` → `completed_lessons[]`, `lesson_dates{}` | Legacy JSON source of truth | EWD'de DROP edildi |
| Override system | `lesson_overrides` tablosu | Tarih/saat değişiklikleri | EWD'de DROP edildi |
| Teacher balance | `teacher_balance` tablosu + `teacherBalance.ts` | Client-side update | RPC-tabanlı |
| Complete write | `LessonTracker.tsx` → `confirmLessonComplete` | Client-side multi-step | `lessonService.completeLesson` → RPC |
| Undo write | `EditStudentDialog.tsx` → `handleUndoLastLesson` | Client-side | `lessonService.undoCompleteLesson` → RPC |
| Reschedule | `LessonOverrideDialog.tsx` | `lesson_overrides` insert/update | Instance direct update |
| Postpone/shift | `LessonOverrideDialog.tsx` + `instanceGeneration.shiftLessonsForward` | Cycle-unaware | Cycle-aware |
| Instance generation | `useScheduleGrid.ts` → `ensureInstancesForWeek` | No cap, no cycle | Capped, cycle-aware |
| Template sync | `instanceGeneration.ts` → `syncTemplateChange` | Cycle-unaware | Cycle-aware |
| Reset | `EditStudentDialog.tsx` → `handleResetAllLessons` | Deletes ALL instances | RPC preserves completed |
| Archive | `AdminDashboard.tsx` inline | Client-side | `lessonService.archiveStudent` → RPC |
| Lesson sorting | `lessonSorting.ts` | Override-aware sorting | Kaldırıldı (gereksiz) |
| Legacy sync | `lessonSync.ts` → `rebuildLegacyLessonDatesFromInstances` | JSON rebuilding | Sadece weekday check |

---

## 4. Portability Decision Matrix

| # | Değişiklik | Durum |
|---|---|---|
| 1 | `package_cycle` filtresi | **Eksik — taşınmalı** |
| 2 | Read path cycle filtering | **Eksik — taşınmalı** |
| 3 | Write path cycle filtering | **Eksik — taşınmalı** |
| 4 | Over-generation koruması | **Eksik — taşınmalı** |
| 5 | Tracker instance-tabanlı okuma | **Eksik — taşınmalı** |
| 6 | Eski cycle instance karışmaması | **Eksik — taşınmalı** |
| 7 | Template change sync güvenliği | **Kısmen var — güçlendirilmeli** |
| 8 | Rights/completed/remaining hesabı | **Eksik — taşınmalı** |
| 9 | Balance integrity (audit + RPC) | **Eksik — taşınmalı** |
| 10 | Archive/delete/reset güvenliği | **Eksik — taşınmalı** |
| 11 | Reschedule/postpone zinciri | **Kısmen var — cycle-aware yapılmalı** |
| 12 | Legacy tracking alanlarının SoT olmaktan çıkarılması | **Eksik — taşınmalı** |
| 13 | Slice/hack kaldırılması | **Eksik — taşınmalı** |
| 14 | Completed vs planned ayrımı | **Kısmen var — cancelled kaldırılmalı** |

---

## 5. Permanent Fixes To Port

1. DB: `package_cycle` kolonu (`student_lesson_tracking` + `lesson_instances`)
2. DB: `balance_events` tablosu + check constraint
3. DB: 8 adet RPC fonksiyonu
4. DB: `notify_admin_last_lesson` trigger güncellemesi
5. DB: `completed_lessons` + `lesson_dates` kolonlarının DROP'u (en son)
6. DB: `lesson_overrides` tablosunun DROP'u (en son)
7. Yeni dosya: `src/lib/lessonService.ts`
8. Güncelleme: `src/lib/instanceGeneration.ts` → cycle-aware
9. Güncelleme: `src/lib/teacherBalance.ts` → RPC kullanımına geçiş (veya korunabilir, RPC zaten bakiye yönetiyor)
10. Güncelleme: `src/hooks/useScheduleGrid.ts` → cycle-aware lazy generation
11. Tam yeniden yazım: `src/components/LessonTracker.tsx`
12. Tam yeniden yazım: `src/components/StudentLessonTracker.tsx`
13. Büyük güncelleme: `src/components/EditStudentDialog.tsx`
14. Güncelleme: `src/components/LessonOverrideDialog.tsx` → instance-only
15. Güncelleme: `src/components/AdminWeeklySchedule.tsx` → override referansları kaldır
16. Silme: `src/lib/lessonSorting.ts`
17. Silme: `src/hooks/useLessonOverrides.ts`
18. Güncelleme: `src/lib/lessonSync.ts` → legacy rebuild kaldır
19. Güncelleme: `src/lib/lessonTypes.ts` → `cancelled` kaldır

---

## 6. File-by-File Code Change Plan

### Phase 1: DB Foundation (migration'lar)

**Migration 1**: `package_cycle` kolonu
```sql
ALTER TABLE student_lesson_tracking
  ADD COLUMN IF NOT EXISTS package_cycle integer NOT NULL DEFAULT 1;
ALTER TABLE lesson_instances
  ADD COLUMN IF NOT EXISTS package_cycle integer NOT NULL DEFAULT 1;
```

**Migration 2**: `balance_events` tablosu
```sql
CREATE TABLE IF NOT EXISTS balance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  event_type text NOT NULL,
  amount_minutes integer NOT NULL,
  instance_id uuid,
  student_id uuid,
  package_cycle integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (event_type IN ('lesson_complete','lesson_undo','trial_complete','trial_undo','manual_adjust','balance_reset','data_repair'))
);
-- RLS policies
```

**Migration 3**: 8 RPC fonksiyonu (EWD'dekiler birebir kopyalanabilir)
- `rpc_complete_lesson`
- `rpc_undo_complete_lesson`
- `rpc_reset_package`
- `rpc_archive_student`
- `rpc_delete_student`
- `rpc_restore_student`
- `rpc_manual_balance_adjust`
- `rpc_complete_trial_lesson`

**Migration 4**: `notify_admin_last_lesson` trigger'ını `lesson_instances` tablosuna bağla

### Phase 2: Yeni servis katmanı

**Yeni dosya: `src/lib/lessonService.ts`**
- EWD'deki `lessonService.ts` birebir kopyalanabilir
- Fonksiyonlar: `completeLesson`, `undoCompleteLesson`, `resetPackage`, `archiveStudent`, `deleteStudent`, `restoreStudent`, `manualBalanceAdjust`, `completeTrialLesson`, `getNextCompletableInstance`, `getLastCompletedInstance`, `getRemainingRights`

### Phase 3: Core lib güncellemeleri

**`src/lib/instanceGeneration.ts`**
- `syncTemplateChange`: cycle filtresi ekle (`package_cycle = currentCycle`)
- `shiftLessonsForward`: cycle filtresi ekle
- Her iki fonksiyonda `student_lesson_tracking.package_cycle` oku

**`src/hooks/useScheduleGrid.ts`** → `ensureInstancesForWeek`
- `package_cycle` tracking data'dan oku
- `totalRights = lpw * 4` cap ekle
- `existingInCycle >= totalRights` guard ekle
- `lastCompletedDate` boundary ekle (planned instance'ı completed'dan önceye koyma)

**`src/lib/lessonTypes.ts`**
- `LessonInstance.status` tipini `"planned" | "completed"` olarak daralt
- `LessonOverrideInfo` interface'ini kaldır
- `SortedLesson.isCancelled` alanını kaldır

**`src/lib/lessonSync.ts`**
- `rebuildLegacyLessonDatesFromInstances` fonksiyonunu kaldır
- Sadece `checkNonTemplateWeekday` kalsın (EWD'deki hali gibi)

**`src/lib/lessonSorting.ts`** → SİL (artık gereksiz)

**`src/hooks/useLessonOverrides.ts`** → SİL (artık gereksiz)

### Phase 4: Tracker component'leri

**`src/components/LessonTracker.tsx`** → TAM YENİDEN YAZIM
- EWD versiyonunun uyarlanması (i18n korunacak)
- `completed_lessons[]` okuma → `lesson_instances` cycle-filtered okuma
- `lesson_overrides` okuma → kaldır
- `handleLessonClick` → RPC üzerinden toggle (complete/undo)
- `confirmLessonComplete` → `lessonService.completeLesson` çağır
- `confirmUndo` ekle → `lessonService.undoCompleteLesson` çağır

**`src/components/StudentLessonTracker.tsx`** → TAM YENİDEN YAZIM
- `completed_lessons[]` / `lesson_dates{}` okuma → `lesson_instances` cycle-filtered
- `lesson_overrides` okuma → kaldır
- Real-time subscription: `lesson_instances` tablosuna geçir

### Phase 5: EditStudentDialog

**`src/components/EditStudentDialog.tsx`** → BÜYÜK GÜNCELLEME
- `fetchLessonTracking`: `completed_lessons` okumayı kaldır, instance'lardan derive et
- `fetchLessonOverrides`: tamamen kaldır
- `handleMarkLastLesson`: → `lessonService.completeLesson` (RPC)
- `handleUndoLastLesson`: → `lessonService.undoCompleteLesson` (RPC)
- `handleResetAllLessons`: → `lessonService.resetPackage` (RPC, completed korunur)
- `confirmDateUpdate`: `lesson_overrides` referanslarını kaldır, instance-only güncelleme
- `handleSubmit` (template save): `lessons_per_week` sync + `syncTemplateChange` cycle-aware
- Instance fetch: `package_cycle` filtresi ekle
- `sortedLessonsForDisplay`: `isCancelled` kaldır
- UI: `cancelled` referanslarını, `Ban` ikonlarını kaldır

### Phase 6: LessonOverrideDialog + WeeklySchedule

**`src/components/LessonOverrideDialog.tsx`**
- `instanceId` prop'u zaten var — güzel
- `lesson_overrides` tablo insert/update/delete kodunu kaldır
- `handleOneTimeChange`: instance direct update (EWD'deki gibi)
- `handlePostponeToNextLesson`: zaten `shiftLessonsForward` kullanıyor
- Revert: instance'ı `original_date/time`'a döndür

**`src/components/AdminWeeklySchedule.tsx`**
- `useLessonOverrides` import'unu kaldır
- `isLessonCancelled` / `getLessonOverride` referanslarını kaldır
- Cancelled lesson styling'i kaldır

### Phase 7: Legacy Cleanup (EN SON)

**Migration 5**: Legacy kolonları DROP
```sql
ALTER TABLE student_lesson_tracking DROP COLUMN IF EXISTS completed_lessons;
ALTER TABLE student_lesson_tracking DROP COLUMN IF EXISTS lesson_dates;
DROP TABLE IF EXISTS lesson_overrides;
```

---

## 7. DB / RPC / Migration Impact

| Sıra | Migration | Veri Riski | Rollback |
|---|---|---|---|
| 1 | `package_cycle` kolon ekleme | Düşük (default 1) | ALTER DROP COLUMN |
| 2 | `balance_events` tablo oluşturma | Yok | DROP TABLE |
| 3 | RPC fonksiyonları | Yok (yeni) | DROP FUNCTION |
| 4 | Trigger güncelleme | Düşük | Eski trigger'a dön |
| 5 | Legacy kolon/tablo DROP | **YÜKSEK** — geri dönüşü zor | Backup alındıysa restore |

**Kritik kural**: Migration 5 (DROP) EN SON yapılmalı, tüm kod geçişi test edildikten sonra.

---

## 8. Risks / Rollback / Validation

### Riskler
1. **Eski cycle instance karışması**: MME'de şu an cycle yok, tüm instance'lar `package_cycle=1` olacak → sorun yok, ilk reset'te 2 olur
2. **Lazy generation şişmesi**: Mevcut uncapped instance'lar zaten veritabanında olabilir → migration'da cleanup gerekebilir
3. **`completed_lessons[]` ↔ `lesson_instances.status` uyumsuzluğu**: Geçiş sırasında ikisi farklı olabilir → migration'da senkronize et
4. **Balance onarımı**: Mevcut balance `balance_events` audit olmadan birikmiş → başlangıç snapshot olarak kabul et
5. **`lesson_overrides` verisinin kaybı**: DROP öncesi override bilgileri instance'lara taşınmalı

### Validation checklist
- Tüm aktif öğrencilerin `package_cycle` = 1 olduğunu doğrula
- `completed_lessons[]` uzunluğu ile `lesson_instances WHERE status='completed'` sayısının eşleştiğini kontrol et
- Lesson override bilgilerinin instance `original_date`'e taşındığını doğrula
- Lazy generation cap'in çalıştığını test et (lpw*4'den fazla instance üretilmediğini)

### Rollback stratejisi
- Her phase kendi migration'ıyla ayrılmış → phase bazında geri alınabilir
- Legacy DROP (Phase 7) EN SON — önceki phase'lerde legacy alanlar hala okunabilir

---

## 9. What NOT to Port

| Kalem | Neden |
|---|---|
| `docs/archive/recovery.html` | Geçici kurtarma aracı |
| `docs/archive/data-recovery-index.ts` | Geçici kurtarma aracı |
| `supabase/functions/data-recovery/` | Geçici edge function |
| `tmp/restore_*.json` | EWD'ye özel veri |
| `fix-rls-recursive-issue.sql` | EWD'ye özel one-time fix |
| Migration `20260318211618` (data repair) | EWD'ye özel veri onarımı |
| `BackSwipeWrapper` / `useBackSwipe` | UI tercihi, zorunlu değil |
| EWD'deki son UI sadeleştirmeleri (kutu boyutu vb.) | MME'nin kendi UI tercihleri var |
| `src/lib/capacitorStorage.ts` | MME'de Capacitor yoksa gereksiz |
| `src/lib/nativeCamera.ts`, `nativeDownload.ts` | MME'ye özel değil |
| `src/lib/pushNotifications.ts` | Ayrıca değerlendirilmeli |

---

## 10. Recommended Migration Phases

```text
Phase 1: DB Foundation
  ├─ package_cycle kolonu
  ├─ balance_events tablosu
  ├─ RPC fonksiyonları
  └─ Data senkronizasyonu (completed_lessons → instance status)

Phase 2: Servis Katmanı
  └─ lessonService.ts oluştur

Phase 3: Core Lib
  ├─ instanceGeneration.ts → cycle-aware
  ├─ useScheduleGrid.ts → capped lazy gen
  ├─ lessonTypes.ts → cancelled kaldır
  └─ lessonSync.ts → legacy temizle

Phase 4: Tracker Components
  ├─ LessonTracker.tsx → instance-tabanlı + RPC
  └─ StudentLessonTracker.tsx → instance-tabanlı

Phase 5: Admin Panel
  ├─ EditStudentDialog.tsx → RPC + cycle-aware
  ├─ LessonOverrideDialog.tsx → instance-only
  └─ AdminWeeklySchedule.tsx → override ref kaldır

Phase 6: Cleanup
  ├─ lessonSorting.ts SİL
  ├─ useLessonOverrides.ts SİL
  └─ cancelled UI referansları temizle

Phase 7: Legacy DROP (test sonrası)
  ├─ completed_lessons, lesson_dates DROP
  └─ lesson_overrides DROP
```

---

## 11. Final Safe Apply Order

1. **Backup**: MME veritabanının tam backup'ını al
2. **Phase 1**: DB migration'ları uygula (kolon + tablo + RPC)
3. **Data sync migration**: `completed_lessons[]` → `lesson_instances.status = 'completed'` senkronize et
4. **Override migration**: `lesson_overrides` verisini `lesson_instances.original_date/time`'a taşı
5. **Phase 2**: `lessonService.ts` oluştur
6. **Phase 3**: Core lib'leri güncelle
7. **Phase 4**: Tracker'ları güncelle — **bu noktada test et**
8. **Phase 5**: EditStudentDialog + Override dialog güncelle — **test et**
9. **Phase 6**: Eski dosyaları sil, cancelled referanslarını temizle — **test et**
10. **Phase 7**: Legacy DROP — **sadece her şey stabil olduktan sonra**

**Not**: Her phase arası test + doğrulama yapılmalı. EWD'de Phase 7'ye çok erken geçilmesi veri kaybına neden olmuştu. MME'de aynı hataya düşmemek için Phase 7, tüm diğer phase'ler en az 1 hafta stabil çalıştıktan sonra uygulanmalı.

---

## Technical Details

### Implementation Notes
- Bu plan EWD projesindeki (English with Dilara) tamamlanmış 7-fazlık refactoring'in MME'ye (Mi Mundo Espanol) aktarılmasını kapsar
- EWD'deki RPC fonksiyonları, `lessonService.ts` ve instance-tabanlı okuma/yazma mantığı referans alınarak kopyalanacak
- MME'nin kendi i18n yapısı (Türkçe/İngilizce/İspanyolca) korunacak
- Her phase bağımsız olarak geri alınabilir migration'larla desteklenecek

