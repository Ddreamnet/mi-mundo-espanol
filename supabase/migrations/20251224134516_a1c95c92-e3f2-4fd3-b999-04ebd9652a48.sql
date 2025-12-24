-- Seed data: Hero content
INSERT INTO public.page_contents (page_key, content)
VALUES ('hero', '{
  "mainTitle": "Geleceğe Emin Adımlarla...",
  "subtitle": "İngilizce öğrenmenin en eğlenceli ve etkili yolu. Profesyonel öğretmenlerle birebir online dersler.",
  "imageUrl": "/uploads/login-bg-169.webp",
  "button1Text": "Ücretsiz Deneme Dersi",
  "button1Link": "/contact",
  "button2Text": "Derslerimizi Keşfet",
  "button2Link": "/lessons"
}'::jsonb)
ON CONFLICT (page_key) DO NOTHING;

-- Seed data: CTA content
INSERT INTO public.page_contents (page_key, content)
VALUES ('cta', '{
  "title": "Hemen Başlayın!",
  "description": "İlk deneme dersiniz ücretsiz. Profesyonel öğretmenlerimizle tanışın ve İngilizce öğrenmenin keyfini çıkarın.",
  "buttonText": "Ücretsiz Ders Al",
  "buttonLink": "/contact"
}'::jsonb)
ON CONFLICT (page_key) DO NOTHING;

-- Seed data: Footer content
INSERT INTO public.page_contents (page_key, content)
VALUES ('footer', '{
  "copyrightText": "Tüm hakları saklıdır.",
  "links": [
    {"label": "Ana Sayfa", "href": "/"},
    {"label": "Dersler", "href": "/lessons"},
    {"label": "Blog", "href": "/blog"},
    {"label": "İletişim", "href": "/contact"}
  ]
}'::jsonb)
ON CONFLICT (page_key) DO NOTHING;

-- Seed data: Contact content
INSERT INTO public.page_contents (page_key, content)
VALUES ('contact', '{
  "title": "Bize Ulaşın",
  "supportText": "İngilizce öğrenme yolculuğunuzda yanınızdayız. Sorularınız için bize ulaşın.",
  "contactItems": [
    {"icon": "Mail", "label": "E-posta", "value": "info@example.com", "href": "mailto:info@example.com"},
    {"icon": "Phone", "label": "Telefon", "value": "+90 555 123 4567", "href": "tel:+905551234567"},
    {"icon": "MapPin", "label": "Adres", "value": "İstanbul, Türkiye", "href": null}
  ]
}'::jsonb)
ON CONFLICT (page_key) DO NOTHING;

-- Seed data: Lessons content
INSERT INTO public.page_contents (page_key, content)
VALUES ('lessons', '{
  "pageTitle": "Derslerimiz",
  "pageSubtitle": "Seviyenize ve hedeflerinize uygun ders seçenekleri",
  "individualTitle": "Bireysel Dersler",
  "individualFeatures": [
    "Birebir özel ders imkanı",
    "Esnek ders saatleri",
    "Kişiye özel müfredat",
    "Hızlı ilerleme"
  ],
  "groupTitle": "Grup Dersleri",
  "groupFeatures": [
    "Ekonomik fiyatlar",
    "Sosyal öğrenme ortamı",
    "Pratik yapma fırsatı",
    "Motivasyon artışı"
  ],
  "contactPhone": "+90 555 123 4567",
  "contactEmail": "info@example.com"
}'::jsonb)
ON CONFLICT (page_key) DO NOTHING;

-- Seed data: Zigzag sections
INSERT INTO public.zigzag_sections (title, items, image_url, image_on_left, order_index, is_active)
VALUES 
(
  'Neden Bizi Tercih Etmelisiniz?',
  '["Deneyimli ve sertifikalı öğretmenler", "Esnek ders saatleri", "Kişiye özel müfredat", "Modern öğretim teknikleri", "Uygun fiyatlar"]'::jsonb,
  '/assets/zigzag-1.png',
  false,
  0,
  true
),
(
  'Online Eğitimin Avantajları',
  '["Evden çıkmadan ders alın", "Zaman ve ulaşım tasarrufu", "Kayıtlı derslerle tekrar imkanı", "Dijital materyaller", "Global erişim"]'::jsonb,
  '/assets/zigzag-2.png',
  true,
  1,
  true
)
ON CONFLICT DO NOTHING;