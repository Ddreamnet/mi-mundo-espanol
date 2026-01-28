
# Ders Notları - Çıkış Sonrası Hata Toast'u Düzeltme Planı

## Sorun Analizi

Kullanıcı çıkış yaptığında "Hata: Ders notları yüklenemedi" toast mesajı görünüyor çünkü:

1. `LessonNotesSection` bileşeni `useEffect` ile otomatik olarak veri çekiyor
2. Çıkış sırasında auth session henüz tam temizlenmeden query çalışmaya devam edebiliyor
3. RLS politikaları authenticated kullanıcı gerektiriyor - çıkış yapıldığında hata oluşuyor
4. Her hata için toast gösteriliyor - çıkış kaynaklı hatalar da dahil

## Çözüm Yaklaşımı

`LessonNotesSection.tsx` dosyasında iki temel değişiklik yapılacak:

### 1. Geçersiz ID Kontrolü
```
useEffect içinde studentId ve teacherId boş ise query yapmayı engelle
```

### 2. Auth Durumu Kontrolü
```
Supabase session yoksa (çıkış yapılmışsa) query yapmayı engelle ve hata toast'u gösterme
```

## Teknik Detaylar

```text
LessonNotesSection.tsx
├── fetchNotes() fonksiyonu
│   ├── Önce session kontrolü yap
│   ├── Session yoksa → sessizce çık, toast gösterme
│   └── Sadece gerçek hatalar için toast göster
│
└── useEffect bağımlılıkları
    └── studentId veya teacherId boşsa → fetch yapma
```

## Yapılacak Değişiklikler

| Dosya | Değişiklik |
|-------|------------|
| `src/components/LessonNotesSection.tsx` | `fetchNotes` fonksiyonunda session kontrolü ekle, boş ID kontrolü ekle |

## Değişiklik Detayı

**`fetchNotes` fonksiyonunda:**
- Supabase session kontrolü eklenecek
- Session yoksa veya ID'ler boşsa erken çıkış yapılacak (toast gösterilmeden)
- Sadece gerçek hatalar (session aktifken) için toast gösterilecek

**`useEffect` içinde:**
- `studentId` veya `teacherId` boş string ise `fetchNotes` çağrılmayacak
