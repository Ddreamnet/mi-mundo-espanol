-- Create global_topic_categories table for language levels (A1, A2, B1, B2, C1, C2)
CREATE TABLE public.global_topic_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_topic_categories ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "admin_full_access_global_categories"
ON public.global_topic_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can view categories
CREATE POLICY "teacher_view_global_categories"
ON public.global_topic_categories
FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role) OR is_teacher(auth.uid()));

-- Students can view categories (through their relationship)
CREATE POLICY "student_view_global_categories"
ON public.global_topic_categories
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM students s WHERE s.student_id = auth.uid()
));

-- Add category_id column to global_topics table
ALTER TABLE public.global_topics 
ADD COLUMN category_id UUID REFERENCES public.global_topic_categories(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_global_topics_category_id ON public.global_topics(category_id);

-- Create RPC function to update topic's category
CREATE OR REPLACE FUNCTION public.update_topic_category(
  topic_id UUID,
  new_category_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE global_topics
  SET category_id = new_category_id, updated_at = now()
  WHERE id = topic_id;
END;
$$;

-- Create RPC function to update category order
CREATE OR REPLACE FUNCTION public.update_global_categories_order(category_orders JSON)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  category_record JSON;
BEGIN
  FOR category_record IN SELECT * FROM json_array_elements(category_orders)
  LOOP
    UPDATE global_topic_categories
    SET order_index = (category_record->>'order_index')::integer,
        updated_at = now()
    WHERE id = (category_record->>'id')::uuid;
  END LOOP;
END;
$$;

-- Insert default language level categories
INSERT INTO public.global_topic_categories (title, description, order_index) VALUES
('A1', 'Başlangıç Seviyesi / Beginner', 0),
('A2', 'Temel Seviye / Elementary', 1),
('B1', 'Orta Seviye / Intermediate', 2),
('B2', 'Orta Üstü Seviye / Upper Intermediate', 3),
('C1', 'İleri Seviye / Advanced', 4),
('C2', 'Uzman Seviye / Proficiency', 5);