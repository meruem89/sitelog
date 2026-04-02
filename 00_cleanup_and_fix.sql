-- CLEANUP SCRIPT
-- Run this FIRST to fix the logs table

-- Step 1: Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own logs" ON logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON logs;
DROP POLICY IF EXISTS "Users can update own logs" ON logs;
DROP POLICY IF EXISTS "Users can delete own logs" ON logs;

DROP POLICY IF EXISTS "Users can upload bills" ON storage.objects;
DROP POLICY IF EXISTS "Bills are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own bills" ON storage.objects;

-- Step 2: Check if user_id column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'logs' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE logs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 3: Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'logs' 
ORDER BY ordinal_position;
