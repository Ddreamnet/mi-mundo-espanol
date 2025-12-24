UPDATE page_contents 
SET content = '{
  "links": [
    {"label": "İletişim", "href": "/iletisim"},
    {"label": "SSS", "href": "#sss"},
    {"label": "Blog", "href": "/blog"},
    {"label": "Gizlilik Politikası", "href": "#gizlilik"}
  ],
  "socialLinks": [
    {"icon": "instagram", "href": "https://www.instagram.com/mi.mundo_espanol/", "label": "Instagram"},
    {"icon": "facebook", "href": "#", "label": "Facebook"},
    {"icon": "whatsapp", "href": "https://wa.me/+905304721875", "label": "WhatsApp"}
  ],
  "copyrightText": "Mi Mundo Español. Tüm hakları saklıdır."
}'::jsonb,
updated_at = now()
WHERE page_key = 'footer'