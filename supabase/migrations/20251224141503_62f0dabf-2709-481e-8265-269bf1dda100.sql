-- Update hero image with uploaded file
UPDATE public.page_contents 
SET content = jsonb_set(
  content,
  '{imageUrl}',
  '"https://miyioionvpkhndrsrnel.supabase.co/storage/v1/object/public/cms-images/hero/1766585331685-b8jwt.PNG"'
),
updated_at = now()
WHERE page_key = 'hero';

-- Update zigzag section 1 with uploaded image
UPDATE public.zigzag_sections 
SET image_url = 'https://miyioionvpkhndrsrnel.supabase.co/storage/v1/object/public/cms-images/zigzag/1766585523318-y6liv.PNG',
updated_at = now()
WHERE order_index = 0;

-- Update zigzag section 2 with uploaded image
UPDATE public.zigzag_sections 
SET image_url = 'https://miyioionvpkhndrsrnel.supabase.co/storage/v1/object/public/cms-images/zigzag/1766585529890-e3ywwd.PNG',
updated_at = now()
WHERE order_index = 1;