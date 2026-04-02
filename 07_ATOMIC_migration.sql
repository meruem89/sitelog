-- COMBINED MIGRATION - Everything in one transaction
-- This will add user_id AND create policies in one go

-- Step 1: Add user_id if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'logs' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE logs ADD COLUMN user_id UUID;
    ALTER TABLE logs ADD CONSTRAINT logs_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added user_id column';
  END IF;
END $$;

-- Step 2: Add approval_status if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'logs' 
      AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE logs ADD COLUMN approval_status TEXT DEFAULT 'Pending';
    ALTER TABLE logs ADD CONSTRAINT logs_approval_status_check 
      CHECK (approval_status IN ('Pending', 'Approved', 'Rejected'));
    RAISE NOTICE 'Added approval_status column';
  END IF;
END $$;

-- Step 3: Create tables
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

-- Step 4: Add site_id if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'logs' 
      AND column_name = 'site_id'
  ) THEN
    ALTER TABLE logs ADD COLUMN site_id UUID;
    ALTER TABLE logs ADD CONSTRAINT logs_site_id_fkey 
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added site_id column';
  END IF;
END $$;

-- Step 5: Enable RLS
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop old policies
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

-- Step 7: Create Logs Policies
CREATE POLICY "Users can view own logs" ON logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON logs FOR DELETE USING (auth.uid() = user_id);

-- Step 8: Create Sites Policies
CREATE POLICY "Users can view own sites" ON sites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sites" ON sites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sites" ON sites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sites" ON sites FOR DELETE USING (auth.uid() = user_id);

-- Step 9: Create Profiles Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Step 10: Create Indexes
CREATE INDEX IF NOT EXISTS logs_user_id_idx ON logs(user_id);
CREATE INDEX IF NOT EXISTS logs_approval_status_idx ON logs(approval_status);
CREATE INDEX IF NOT EXISTS logs_site_id_idx ON logs(site_id);
CREATE INDEX IF NOT EXISTS logs_created_at_idx ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- Step 11: Create Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'Operator')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Create Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify success
SELECT 'Migration Complete! ✅' AS status;
SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'logs';
