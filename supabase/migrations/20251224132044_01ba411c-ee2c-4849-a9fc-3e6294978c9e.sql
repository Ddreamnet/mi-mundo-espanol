-- 1. Sayfa içerikleri için ana tablo
CREATE TABLE public.page_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- 2. Zigzag bölümleri için tablo
CREATE TABLE public.zigzag_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_index INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  image_url TEXT,
  image_on_left BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Testimonials için tablo
CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote TEXT NOT NULL,
  author_name TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zigzag_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for page_contents
CREATE POLICY "public_read_page_contents" ON public.page_contents
FOR SELECT USING (true);

CREATE POLICY "admin_manage_page_contents" ON public.page_contents
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for zigzag_sections
CREATE POLICY "public_read_zigzag_sections" ON public.zigzag_sections
FOR SELECT USING (true);

CREATE POLICY "admin_manage_zigzag_sections" ON public.zigzag_sections
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for testimonials
CREATE POLICY "public_read_testimonials" ON public.testimonials
FOR SELECT USING (true);

CREATE POLICY "admin_manage_testimonials" ON public.testimonials
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_page_contents_updated_at
BEFORE UPDATE ON public.page_contents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_zigzag_sections_updated_at
BEFORE UPDATE ON public.zigzag_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_testimonials_updated_at
BEFORE UPDATE ON public.testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default testimonials (mevcut veriler)
INSERT INTO public.testimonials (quote, order_index, is_active) VALUES
('Mi Mundo Español ile İspanyolca öğrenmek çok keyifli! Esnek ders saatleri ve birebir ilgi sayesinde kısa sürede büyük ilerleme kaydettim.', 0, true),
('Öğretmenimin sabırlı ve destekleyici yaklaşımı sayesinde artık İspanyolca konuşmaktan korkmuyorum. Herkese tavsiye ederim!', 1, true),
('Online dersler sayesinde evimin konforunda, istediğim zaman İspanyolca öğrenebiliyorum. Harika bir deneyim!', 2, true),
('Dil öğrenmeye yıllar sonra tekrar başladım ve Mi Mundo Español bu yolculukta bana mükemmel bir rehber oldu.', 3, true),
('Grup derslerindeki etkileşim ve eğlenceli atmosfer motivasyonumu her zaman yüksek tutuyor.', 4, true);