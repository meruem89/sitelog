-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('Material', 'Labour', 'Service')),
  description TEXT NOT NULL,
  cost NUMERIC NOT NULL CHECK (cost >= 0),
  bill_image_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS logs_user_id_idx ON logs(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS logs_created_at_idx ON logs(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own logs
CREATE POLICY "Users can view own logs"
  ON logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own logs
CREATE POLICY "Users can insert own logs"
  ON logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own logs
CREATE POLICY "Users can update own logs"
  ON logs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own logs
CREATE POLICY "Users can delete own logs"
  ON logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for bills (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bills', 'bills', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Users can upload bills
CREATE POLICY "Users can upload bills"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'bills' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: Anyone can view bills (public bucket)
CREATE POLICY "Bills are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'bills');

-- Storage policy: Users can delete their own bills
CREATE POLICY "Users can delete own bills"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'bills' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
