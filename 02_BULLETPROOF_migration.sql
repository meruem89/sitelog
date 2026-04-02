-- BULLETPROOF MIGRATION - Run this instead of 02_add_approvals_schema.sql

-- ============================================
-- STEP 1: Drop all policies first
-- ============================================
DROP POLICY IF EXISTS "Users can view own logs" ON logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON logs;
DROP POLICY IF EXISTS "Users can update own logs" ON logs;
DROP POLICY IF EXISTS "Users can delete own logs" ON logs;

-- ============================================
-- STEP 2: Add user_id column to logs (if missing)
-- ============================================
DO $$ 
BEGIN
    -- Check if user_id exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'logs' AND column_name = 'user_id'
    ) THEN
        -- Add user_id column
        ALTER TABLE logs ADD COLUMN user_id UUID;
        
        -- Add foreign key constraint
        ALTER TABLE logs ADD CONSTRAINT logs_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added user_id column to logs table';
    ELSE
        RAISE NOTICE 'user_id column already exists';
    END IF;
END $$;

-- ============================================
-- STEP 3: Create profiles table
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'Operator',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint to profiles.role
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('Master', 'Operator'));
    END IF;
END $$;

-- ============================================
-- STEP 4: Create sites table
-- ============================================
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 5: Add approval_status to logs
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'logs' AND column_name = 'approval_status'
    ) THEN
        ALTER TABLE logs ADD COLUMN approval_status TEXT DEFAULT 'Pending';
        
        ALTER TABLE logs ADD CONSTRAINT logs_approval_status_check 
        CHECK (approval_status IN ('Pending', 'Approved', 'Rejected'));
        
        RAISE NOTICE 'Added approval_status column to logs table';
    ELSE
        RAISE NOTICE 'approval_status column already exists';
    END IF;
END $$;

-- ============================================
-- STEP 6: Add site_id to logs
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'logs' AND column_name = 'site_id'
    ) THEN
        ALTER TABLE logs ADD COLUMN site_id UUID;
        
        ALTER TABLE logs ADD CONSTRAINT logs_site_id_fkey 
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added site_id column to logs table';
    ELSE
        RAISE NOTICE 'site_id column already exists';
    END IF;
END $$;

-- ============================================
-- STEP 7: Enable RLS on all tables
-- ============================================
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 8: Create Logs Policies
-- ============================================
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

-- ============================================
-- STEP 9: Create Sites Policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own sites" ON sites;
DROP POLICY IF EXISTS "Users can insert own sites" ON sites;
DROP POLICY IF EXISTS "Users can update own sites" ON sites;
DROP POLICY IF EXISTS "Users can delete own sites" ON sites;

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

-- ============================================
-- STEP 10: Create Profiles Policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- STEP 11: Create Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS logs_user_id_idx ON logs(user_id);
CREATE INDEX IF NOT EXISTS logs_approval_status_idx ON logs(approval_status);
CREATE INDEX IF NOT EXISTS logs_site_id_idx ON logs(site_id);
CREATE INDEX IF NOT EXISTS logs_created_at_idx ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- ============================================
-- STEP 12: Create Profile Auto-Creation Function
-- ============================================
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

-- ============================================
-- STEP 13: Create Trigger
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SUCCESS! Check results:
-- ============================================
SELECT 'Migration completed successfully!' AS status;

-- Verify logs table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'logs' 
ORDER BY ordinal_position;
