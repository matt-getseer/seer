BEGIN;
  -- Allow public read access to files in the logos bucket
  CREATE POLICY "Allow public read access" ON storage.objects FOR SELECT TO public 
  USING (bucket_id = 'logos');

  -- Allow authenticated users to upload files to logos bucket
  CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'logos');

  -- Allow authenticated users to update their files in logos bucket
  CREATE POLICY "Allow authenticated updates" ON storage.objects FOR UPDATE TO authenticated 
  USING (bucket_id = 'logos');

  -- Allow authenticated users to delete their files in logos bucket
  CREATE POLICY "Allow authenticated deletes" ON storage.objects FOR DELETE TO authenticated 
  USING (bucket_id = 'logos');
COMMIT; 