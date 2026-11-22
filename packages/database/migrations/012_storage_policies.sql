-- Storage bucket policies for proof-media
-- Allows authenticated users to upload and read proof files

CREATE POLICY "Members can upload proof"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proof-media');

CREATE POLICY "Authenticated can read proof"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'proof-media');

CREATE POLICY "Members can update their proof"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'proof-media');

