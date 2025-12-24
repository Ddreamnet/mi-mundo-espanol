-- Fix contact page content with proper data
UPDATE public.page_contents 
SET content = jsonb_build_object(
  'pageTitle', 'İletişim',
  'supportText', '7/24 Destek',
  'contactItems', jsonb_build_array(
    jsonb_build_object('icon', 'phone', 'label', 'Telefon', 'value', '+90 530 472 1875', 'href', 'tel:+905304721875'),
    jsonb_build_object('icon', 'mail', 'label', 'Mail', 'value', 'mimundoespanol@outlook.com', 'href', 'mailto:mimundoespanol@outlook.com'),
    jsonb_build_object('icon', 'mail', 'label', 'Mail - 2', 'value', 'mertaydin245@hotmail.com', 'href', 'mailto:mertaydin245@hotmail.com'),
    jsonb_build_object('icon', 'whatsapp', 'label', 'Whatsapp', 'value', 'WhatsApp ile İletişim', 'href', 'https://wa.me/message/2ESUR45URXTFJ1'),
    jsonb_build_object('icon', 'instagram', 'label', 'Instagram', 'value', '@mi.mundo_espanol', 'href', 'https://instagram.com/mi.mundo_espanol'),
    jsonb_build_object('icon', 'facebook', 'label', 'Facebook', 'value', 'Mi Mundo Espanol', 'href', 'https://facebook.com/MiMundoEspanol')
  )
),
updated_at = now()
WHERE page_key = 'contact';