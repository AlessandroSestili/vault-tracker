-- Add image_url to all entity tables
ALTER TABLE accounts    ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE positions   ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE liabilities ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create public logos bucket
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('logos', 'logos', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read logos
CREATE POLICY "logos_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'logos');

-- Allow anon key to upload logos
CREATE POLICY "logos_anon_insert" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'logos');

-- Allow anon key to delete/replace logos
CREATE POLICY "logos_anon_delete" ON storage.objects
  FOR DELETE TO anon USING (bucket_id = 'logos');
