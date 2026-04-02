-- FINAL MIGRATION - user_id already exists, just add everything else

-- STEP 1: Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view own logs" ON logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON logs;
DROP POLICY IF EXISTS "Users can update own logs" ON logs;
DROP POLICY IF EXISTS "Users can delete own logs" ON logs;
DROP POLICY IF EXISTS "Users can view own sites" ON sites;
DROP POLICY IF EXISTS "Users can insert own sites" ON sites;
DROP POLICY IF EXISTS "Users can update own sites" ON sites;
DROP POLICY IF EXISTS "Users can delete own sites" ON sites;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- STEP 2: Add approval_status column (skip if already exists)
DO $$ 
BEGIN
  ALTER TABLE logs ADD COLUMN approval_status TEXT DEFAULT 'Pending' 
    CHECK (approval_status IN ('Pending', 'Approved', 'Rejected'));
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- STEP 3: Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'Operator' CHECK (role IN ('Master', 'Operator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 4: Create sites table
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 5: Add site_id to logs (skip if already exists)
DO $$ 
BEGIN
  ALTER TABLE logs ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- STEP 6: Enable RLS on all tables
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- STEP 7: Create Logs Policies
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

-- STEP 8: Create Sites Policies
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

-- STEP 9: Create Profiles Policies
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- STEP 10: Create Indexes
CREATE INDEX IF NOT EXISTS logs_user_id_idx ON logs(user_id);
CREATE INDEX IF NOT EXISTS logs_approval_status_idx ON logs(approval_status);
CREATE INDEX IF NOT EXISTS logs_site_id_idx ON logs(site_id);
CREATE INDEX IF NOT EXISTS logs_created_at_idx ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- STEP 11: Create Profile Auto-Creation Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
    'Operator'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 12: Create Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 13: Verify the migration
SELECT 'Migration completed successfully! ✅' AS status;

-- Show final logs table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'logs' 
ORDER BY ordinal_position;
