-- Storage bucket for location media (images, etc.)
-- Path: media/{location_id}/{filename}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow authenticated users (admins) to upload to media bucket
-- Object path: {location_id}/{filename}
CREATE POLICY "Allow authenticated upload to media bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Allow public read (images are public)
CREATE POLICY "Allow public read media bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- Allow authenticated users to update/delete their uploads
CREATE POLICY "Allow authenticated update media bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media');

CREATE POLICY "Allow authenticated delete media bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media');

-- RLS for location_media table
ALTER TABLE public.location_media ENABLE ROW LEVEL SECURITY;

-- Public read (needed for builder page and mobile app)
DROP POLICY IF EXISTS "location_media_select_public" ON public.location_media;
CREATE POLICY "location_media_select_public"
ON public.location_media FOR SELECT
TO anon, authenticated
USING (true);

-- Admin insert/update/delete (same school as location)
DROP POLICY IF EXISTS "location_media_insert_admin" ON public.location_media;
CREATE POLICY "location_media_insert_admin"
ON public.location_media FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.locations l
    JOIN public.profiles p ON p.school_id = l.school_id AND p.id = auth.uid()
    WHERE l.id = location_media.location_id
    AND LOWER(p.role) IN ('admin', 'super-admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "location_media_update_admin" ON public.location_media;
CREATE POLICY "location_media_update_admin"
ON public.location_media FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.locations l
    JOIN public.profiles p ON p.school_id = l.school_id AND p.id = auth.uid()
    WHERE l.id = location_media.location_id
    AND LOWER(p.role) IN ('admin', 'super-admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "location_media_delete_admin" ON public.location_media;
CREATE POLICY "location_media_delete_admin"
ON public.location_media FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.locations l
    JOIN public.profiles p ON p.school_id = l.school_id AND p.id = auth.uid()
    WHERE l.id = location_media.location_id
    AND LOWER(p.role) IN ('admin', 'super-admin', 'super_admin')
  )
);
