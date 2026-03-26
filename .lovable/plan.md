

# Fix: `lesson_instances` Unique Constraint — `package_cycle` Eksik

## Sorun
`lesson_instances_student_id_teacher_id_lesson_number_key` constraint'i:
```
UNIQUE (student_id, teacher_id, lesson_number)
```
Ama `rpc_reset_package` yeni cycle'da `lesson_number` 1'den başlıyor → eski cycle'daki completed kayıtlarla çakışma → **duplicate key hatası**.

## Çözüm
Tek migration — constraint'ı `package_cycle` dahil ederek yeniden oluştur:

```sql
ALTER TABLE public.lesson_instances
  DROP CONSTRAINT lesson_instances_student_id_teacher_id_lesson_number_key;

ALTER TABLE public.lesson_instances
  ADD CONSTRAINT lesson_instances_student_teacher_lesson_cycle_key
  UNIQUE (student_id, teacher_id, lesson_number, package_cycle);
```

## Etki
- Sıfır veri kaybı — sadece constraint değişiyor
- `rpc_reset_package` artık hatasız çalışacak
- Her cycle kendi lesson_number serisini bağımsız tutabilecek
- Mevcut veriler zaten cycle bazında unique olduğu için constraint hatasız uygulanacak

