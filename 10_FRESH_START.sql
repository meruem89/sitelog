-- FRESH START MIGRATION - Complete rebuild
-- This drops and recreates everything cleanly

-- Step 1: Drop existing tables (CASCADE removes dependencies)
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS sites CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Step 2: Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'Operator' CHECK (role IN ('Master', 'Operator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create sites table
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create logs table with ALL columns
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('Material', 'Labour', 'Service')),
  description TEXT NOT NULL,
  cost NUMERIC NOT NULL CHECK (cost >= 0),
  bill_image_url TEXT,
  approval_status TEXT DEFAULT 'Pending' CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create indexes
CREATE INDEX logs_user_id_idx ON logs(user_id);
CREATE INDEX logs_site_id_idx ON logs(site_id);
CREATE INDEX logs_approval_status_idx ON logs(approval_status);
CREATE INDEX logs_created_at_idx ON logs(created_at DESC);
CREATE INDEX sites_user_id_idx ON sites(user_id);
CREATE INDEX profiles_role_idx ON profiles(role);

-- Step 6: Enable RLS on all tables
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 7: Create Logs Policies
CREATE POLICY "Users can view own logs"
  ON logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs"
  ON logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs"
  ON logs FOR DELETE
  USING (auth.uid() = user_id);

-- Step 8: Create Sites Policies
CREATE POLICY "Users can view own sites"
  ON sites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sites"
  ON sites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sites"
  ON sites FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sites"
  ON sites FOR DELETE
  USING (auth.uid() = user_id);

-- Step 9: Create Profiles Policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Step 10: Create storage bucket for bills (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bills', 'bills', true)
ON CONFLICT (id) DO NOTHING;

-- Step 11: Storage policies
DROP POLICY IF EXISTS "Users can upload bills" ON storage.objects;
DROP POLICY IF EXISTS "Bills are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own bills" ON storage.objects;

CREATE POLICY "Users can upload bills"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bills' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Bills are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bills');

CREATE POLICY "Users can delete own bills"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'bills' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Step 12: Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'Operator'  -- Default role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 14: Verify everything was created
SELECT '🎉 Fresh migration complete! Everything recreated successfully! ✅' AS status;

-- Show the new logs table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'logs' AND table_schema = 'public'
ORDER BY ordinal_position;
