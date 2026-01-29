-- Add video support to media bucket (additional media only - primary remains image)
-- Video MIME types: mp4, webm, mov, ogg
-- Increased file size limit to 50MB for videos

UPDATE storage.buckets
SET
  file_size_limit = 52428800,  -- 50MB
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'video/x-msvideo'
  ]
WHERE id = 'media';
