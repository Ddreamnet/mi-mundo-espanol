# Mi Mundo Español

Online İspanyolca dersleri için tanıtım sitesi ve ders yönetim paneli.
Ziyaretçiye tanıtım sayfaları, blog ve iletişim; öğrenci, eğitmen ve yöneticiye
kendi paneli sunulur.

## Teknolojiler

| Katman | Kullanılan |
|---|---|
| Derleme | Vite + TypeScript |
| Arayüz | React 18, Tailwind CSS, shadcn/ui (Radix) |
| Veri | Supabase (PostgreSQL, Auth, Storage) |
| Sunucu durumu | TanStack Query |
| Yönlendirme | React Router |
| Dil desteği | i18next (tr / en / es) |

## Kurulum

Node.js 18+ ve npm gerekir.

```sh
npm install
npm run dev          # http://localhost:8080
```

Ortam değişkenleri `.env` dosyasında tutulur:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Komutlar

```sh
npm run dev          # geliştirme sunucusu
npm run build        # üretim derlemesi (+ statik SEO sayfaları, sitemap, robots)
npm run preview      # derlenmiş çıktıyı yerelde sun
npm run lint         # ESLint
```

## SEO

Sitenin arama motoru davranışı tek bir dosyadan yönetilir:
**`src/lib/seo.config.ts`**

- `SITE_URL` — canonical adres. Domain değişirse **sadece burası** güncellenir;
  canonical etiketleri, `og:url`, `sitemap.xml` ve `robots.txt` bu değerden üretilir.
  `public/.htaccess` içindeki yönlendirme adresi de aynı olmalı.
- `PAGE_SEO` — her rotanın başlığı, açıklaması ve sitemap önceliği (tr/en/es).

Uygulama bir SPA olduğu için sunucudan gelen HTML normalde her rotada aynıdır.
`vite.config.ts` içindeki **`staticSeoPages`** eklentisi bunu çözer: `npm run build`
sonunda her rota için ayrı bir `dist/<rota>/index.html` üretir. Her dosya kendi
`<title>`, `description`, `canonical`, Open Graph ve schema.org verisini taşır;
böylece Google ve JavaScript çalıştırmayan WhatsApp/Facebook önizlemeleri doğru
bilgiyi görür. Tarayıcıda React yüklendikten sonra `src/components/Seo.tsx`
gezinme sırasında aynı etiketleri günceller.

Yeni bir sayfa eklerken rotayı `PAGE_SEO` içine de eklemek gerekir; aksi halde
sayfa `sitemap.xml`'e ve statik üretime dahil olmaz.

Görseller `public/` altındadır: `og-image.png` (1200×630 paylaşım kartı),
`icon-192.png` / `icon-512.png` / `icon-maskable-512.png` (PWA ikonları).

## Yayına alma

`npm run build` çıktısı `dist/` klasöründedir; statik olarak sunulur.
`public/.htaccess` Apache için hazırdır ve şunları yapar: http → https ve
www'suz → www 301 yönlendirmesi, ön-üretilmiş sayfaların yönlendirmesiz
sunulması, kalan rotaların SPA'ya devri, sıkıştırma, önbellek ve güvenlik
başlıkları.

Yayına aldıktan sonra:

1. Google Search Console'da mülkü doğrulayın.
2. `https://www.mimundoespanol.com/sitemap.xml` adresini gönderin.
3. Yapısal veriyi [Rich Results Test](https://search.google.com/test/rich-results)
   ile kontrol edin.

## Proje yapısı

```
src/
  components/
    landing/        tanıtım sayfası bölümleri
    admin/          yönetim paneli düzenleyicileri
    ui/             shadcn/ui bileşenleri
    Seo.tsx         rota bazlı <head> yönetimi
  pages/            Dersler, SSS, Blog, İletişim, Gizlilik, 404
  contexts/         dil yönetimi
  integrations/     Supabase istemcisi ve tipleri
  locales/          tr / en / es çevirileri
  lib/seo.config.ts SEO tek kaynağı
docs/clone/         yeni bir Supabase projesine kurulum rehberi ve SQL'ler
supabase/           edge fonksiyonları ve migration'lar
```
