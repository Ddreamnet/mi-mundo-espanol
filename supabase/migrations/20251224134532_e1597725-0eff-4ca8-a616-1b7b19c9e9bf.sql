-- Create storage bucket for CMS images
INSERT INTO storage.buckets (id, name, public)
VALUES ('cms-images', 'cms-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public can view cms images"
ON storage.objects FOR SELECT
USING (bucket_id = 'cms-images');

-- Allow admins to upload
CREATE POLICY "Admins can upload cms images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'cms-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update
CREATE POLICY "Admins can update cms images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'cms-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'cms-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete
CREATE POLICY "Admins can delete cms images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'cms-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);