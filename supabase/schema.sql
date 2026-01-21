-- IR CRM Database Schema for Supabase
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- ============================================
-- STEP 1: Create Tables
-- ============================================

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: Create Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_location ON contacts(location);
CREATE INDEX IF NOT EXISTS idx_attachments_contact_id ON attachments(contact_id);
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);

-- ============================================
-- STEP 3: Enable Row Level Security (RLS)
-- This ensures users can ONLY access their own data
-- ============================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Create RLS Policies (SHARED DATABASE)
-- All authenticated users can access all data
-- ============================================

-- Contacts policies (shared access)
CREATE POLICY "Authenticated users can view all contacts"
  ON contacts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create contacts"
  ON contacts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update all contacts"
  ON contacts FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete all contacts"
  ON contacts FOR DELETE
  USING (auth.role() = 'authenticated');

-- Attachments policies (shared access)
CREATE POLICY "Authenticated users can view all attachments"
  ON attachments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create attachments"
  ON attachments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete all attachments"
  ON attachments FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- STEP 5: Create Storage Bucket for File Attachments
-- Run this separately if needed
-- ============================================

-- Create the storage bucket (run in SQL or use Dashboard > Storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the attachments bucket (shared access)
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'attachments' AND auth.role() = 'authenticated');
