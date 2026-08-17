-- Employee identity-card photos. Run once in Supabase SQL Editor.
-- Keeps files scoped to a venture folder and allows only venture members to manage them.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('employee-photos', 'employee-photos', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Venture members manage employee photos" ON storage.objects;
CREATE POLICY "Venture members manage employee photos"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'employee-photos'
  AND public.has_venture_access((storage.foldername(name))[1]::UUID)
)
WITH CHECK (
  bucket_id = 'employee-photos'
  AND public.has_venture_access((storage.foldername(name))[1]::UUID)
);
