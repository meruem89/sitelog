-- PART 1: Add columns ONLY (run this first)

-- Add approval_status column with error handling
DO $$ 
BEGIN
  ALTER TABLE logs ADD COLUMN approval_status TEXT DEFAULT 'Pending' 
    CHECK (approval_status IN ('Pending', 'Approved', 'Rejected'));
  RAISE NOTICE 'Added approval_status column';
EXCEPTION
  WHEN duplicate_column THEN 
    RAISE NOTICE 'approval_status already exists, skipping';
END $$;

-- Create sites table first (needed for site_id foreign key)
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add site_id column with error handling
DO $$ 
BEGIN
  ALTER TABLE logs ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE SET NULL;
  RAISE NOTICE 'Added site_id column';
EXCEPTION
  WHEN duplicate_column THEN 
    RAISE NOTICE 'site_id already exists, skipping';
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'Operator' CHECK (role IN ('Master', 'Operator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verify columns were added
SELECT 'PART 1 Complete! ✅ Run PART 2 next.' AS status;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'logs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
