-- Employee identity-card photos. Run once in Supabase SQL Editor.
-- Keeps files scoped to a venture folder and allows only venture members to manage them.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('employee-photos', 'employee-photos', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Safe UUID cast helper with exception safety to prevent runtime cast errors on malformed folder names
CREATE OR REPLACE FUNCTION public.safe_cast_to_uuid(val TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF val IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN val::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.safe_cast_to_uuid(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.safe_cast_to_uuid(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Venture members manage employee photos" ON storage.objects;
CREATE POLICY "Venture members manage employee photos"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'employee-photos'
  AND CASE
    WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN public.has_venture_access(public.safe_cast_to_uuid((storage.foldername(name))[1]))
    ELSE FALSE
  END
)
WITH CHECK (
  bucket_id = 'employee-photos'
  AND CASE
    WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN public.has_venture_access(public.safe_cast_to_uuid((storage.foldername(name))[1]))
    ELSE FALSE
  END
);
