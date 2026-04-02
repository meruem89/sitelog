-- PART 2: Add policies and triggers (run this AFTER Part 1 succeeds)

-- Drop existing policies
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

-- Enable RLS
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create Logs Policies
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

-- Create Sites Policies
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

-- Create Profiles Policies
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Create Indexes
CREATE INDEX IF NOT EXISTS logs_user_id_idx ON logs(user_id);
CREATE INDEX IF NOT EXISTS logs_approval_status_idx ON logs(approval_status);
CREATE INDEX IF NOT EXISTS logs_site_id_idx ON logs(site_id);
CREATE INDEX IF NOT EXISTS logs_created_at_idx ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- Create Profile Auto-Creation Function
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

-- Create Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Success!
SELECT 'PART 2 Complete! ✅ Migration finished!' AS status;
