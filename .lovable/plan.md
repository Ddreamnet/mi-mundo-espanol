

# Fix: İkinci Orphan Trigger — `on_last_lesson_warning`

## Sorun
`student_lesson_tracking` tablosunda **iki** trigger vardı, ikisi de `notify_admin_last_lesson()` fonksiyonunu çağırıyordu:

1. `on_lesson_tracking_update_notify_admin` — önceki migration'da silindi ✅
2. `on_last_lesson_warning` — hala aktif ❌

`notify_admin_last_lesson()` fonksiyonu `NEW.status` alanına erişiyor. Bu alan `lesson_instances` tablosunda var ama `student_lesson_tracking` tablosunda yok. Bu yüzden `rpc_sync_student_schedule` veya herhangi bir `student_lesson_tracking` UPDATE'i bu hatayı veriyor.

## Çözüm
Tek migration — orphan trigger'ı sil:

```sql
DROP TRIGGER IF EXISTS on_last_lesson_warning ON public.student_lesson_tracking;
```

## Etki
- Sıfır risk — sadece hatalı trigger kaldırılıyor
- `lesson_instances` üzerindeki `notify_last_lesson_trigger` zaten doğru çalışıyor
- Öğrenci ayarları kaydetme, ders işlendi, geri alma hepsi düzelecek
- Phase 7 ile ilgisi yok

