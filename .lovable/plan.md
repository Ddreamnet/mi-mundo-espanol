

# Fix: `notify_admin_last_lesson` Duplicate Trigger

## Sorun
`student_lesson_tracking` tablosunda hala eski trigger `on_lesson_tracking_update_notify_admin` yaşıyor. `rpc_complete_lesson` bu tabloyu legacy compat için güncellediğinde trigger ateşleniyor ve `NEW.status` arıyor — ama bu tabloda `status` kolonu yok.

## Çözüm
Tek bir migration: eski trigger'ı ismiyle sil.

```sql
DROP TRIGGER IF EXISTS on_lesson_tracking_update_notify_admin ON public.student_lesson_tracking;
```

Bu kadar. Yeni trigger (`notify_last_lesson_trigger ON lesson_instances`) zaten doğru çalışıyor.

## Etki
- Sıfır risk — sadece hatalı eski trigger kaldırılıyor
- `rpc_complete_lesson` ve `rpc_undo_complete_lesson` hatasız çalışacak
- Bildirim mantığı `lesson_instances` trigger'ından doğru şekilde devam edecek

