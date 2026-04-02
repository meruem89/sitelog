-- FINAL WORKING MIGRATION - Uses exception handling instead of checks

-- Step 1: Try to add user_id (ignore if exists)
DO $$ 
BEGIN
  ALTER TABLE logs ADD COLUMN user_id UUID;
  RAISE NOTICE 'Added user_id column';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'user_id already exists, continuing...';
END $$;

-- Step 2: Try to add foreign key constraint (ignore if exists)
DO $$ 
BEGIN
  ALTER TABLE logs ADD CONSTRAINT logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added user_id foreign key';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'user_id foreign key already exists, continuing...';
END $$;

-- Step 3: Try to add approval_status
DO $$ 
BEGIN
  ALTER TABLE logs ADD COLUMN approval_status TEXT DEFAULT 'Pending';
  RAISE NOTICE 'Added approval_status column';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'approval_status already exists, continuing...';
END $$;

-- Step 4: Try to add approval_status check constraint
DO $$ 
BEGIN
  ALTER TABLE logs ADD CONSTRAINT logs_approval_status_check 
    CHECK (approval_status IN ('Pending', 'Approved', 'Rejected'));
  RAISE NOTICE 'Added approval_status check';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'approval_status check already exists, continuing...';
END $$;

-- Step 5: Create tables
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'Operator' CHECK (role IN ('Master', 'Operator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Try to add site_id
DO $$ 
BEGIN
  ALTER TABLE logs ADD COLUMN site_id UUID;
  RAISE NOTICE 'Added site_id column';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'site_id already exists, continuing...';
END $$;

-- Step 7: Try to add site_id foreign key
DO $$ 
BEGIN
  ALTER TABLE logs ADD CONSTRAINT logs_site_id_fkey 
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL;
  RAISE NOTICE 'Added site_id foreign key';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'site_id foreign key already exists, continuing...';
END $$;

-- Step 8: Enable RLS
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 9: Drop old policies
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

-- Step 10: Create Logs Policies (these will now work!)
CREATE POLICY "Users can view own logs" ON logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON logs FOR DELETE USING (auth.uid() = user_id);

-- Step 11: Create Sites Policies
CREATE POLICY "Users can view own sites" ON sites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sites" ON sites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sites" ON sites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sites" ON sites FOR DELETE USING (auth.uid() = user_id);

-- Step 12: Create Profiles Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Step 13: Create Indexes
CREATE INDEX IF NOT EXISTS logs_user_id_idx ON logs(user_id);
CREATE INDEX IF NOT EXISTS logs_approval_status_idx ON logs(approval_status);
CREATE INDEX IF NOT EXISTS logs_site_id_idx ON logs(site_id);
CREATE INDEX IF NOT EXISTS logs_created_at_idx ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- Step 14: Create Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'Operator')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 15: Create Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Success!
SELECT '🎉 Migration Complete! All policies created successfully! ✅' AS status;
