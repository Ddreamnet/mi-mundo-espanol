

# Fix: Öğrenci Oluşturulduğunda Ders Tarihleri (lesson_instances) Otomatik Oluşsun

## Sorun
`create-student` edge function'ı şu adımları yapıyor:
1. Auth user oluştur ✅
2. Profile (trigger ile) ✅
3. `students` ilişki kaydı ✅
4. `student_lessons` template slotları ✅
5. `student_lesson_tracking` ✅
6. **`lesson_instances` oluşturma → YOK** ❌

Template slotlar var ama gerçek tarihli ders instance'ları hiç üretilmiyor. Bu yüzden öğrenci ayarlarında tarih yok, hizala/ok butonları görünmüyor.

## Çözüm
Edge function'da tracking kaydı oluşturduktan sonra `rpc_sync_student_schedule` RPC'sini çağır. Bu RPC zaten tam olarak bunu yapıyor: template slotlardan tarihli `lesson_instances` üretiyor.

### Değişiklik: `supabase/functions/create-student/index.ts`

Tracking insert'ten sonra şu bloğu ekle:

```typescript
// Generate lesson instances with dates using the sync RPC
if (lessons && lessons.length > 0) {
  const slots = lessons.map((lesson: any) => ({
    dayOfWeek: lesson.day_of_week,
    startTime: lesson.start_time,
    endTime: lesson.end_time
  }));

  const { data: syncResult, error: syncError } = await supabaseAdmin.rpc(
    'rpc_sync_student_schedule',
    {
      p_student_id: authData.user.id,
      p_teacher_id: teacherId,
      p_slots: slots,
      p_lessons_per_week: lessonsPerWeek
    }
  );

  if (syncError) {
    console.error('Sync error:', syncError);
  } else {
    console.log('Sync result:', syncResult);
  }
}
```

## Etki
- Sıfır risk — mevcut veriler etkilenmez
- Yeni öğrenci oluşturulduğunda bugünden itibaren `lessonsPerWeek * 4` adet `lesson_instances` kaydı oluşacak
- Öğrenci ayarlarında tarihler, hizala butonu, ok butonları hemen görünecek
- `rpc_sync_student_schedule` zaten idempotent — tekrar çalıştırılsa bile sorun çıkarmaz

## Neden EWD'de Bu Sorun Yok?
EWD'de öğrenci oluşturma akışı instance üretimini dahil ediyor. Bu projede Phase 7 temizliği sırasında legacy `completed_lessons`/`lesson_dates` alanları silindi ama instance üretimi hiç eklenmemişti — eksik kalmış bir adımdı.

