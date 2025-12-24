-- Fix hero content to match original Spanish theme
UPDATE public.page_contents 
SET content = jsonb_build_object(
  'mainTitle', 'İspanyolca Dünyan',
  'subtitle', 'Dil öğrenmenin en keyifli yolu. Profesyonel öğretmenlerle birebir online dersler.',
  'imageUrl', '',
  'primaryButtonText', 'Hemen Başla',
  'primaryButtonLink', '#contact',
  'secondaryButtonText', 'Dersler',
  'secondaryButtonLink', '/lessons'
),
updated_at = now()
WHERE page_key = 'hero';