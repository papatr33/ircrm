-- Migration: Add new fields to contacts table
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor) if you already have the contacts table

-- Add institution column
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS institution TEXT;

-- Add last_interaction_date column
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS last_interaction_date DATE;

-- Add priority column with constraint
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS priority INTEGER CHECK (priority >= 1 AND priority <= 5);

-- Create index on institution for faster searches
CREATE INDEX IF NOT EXISTS idx_contacts_institution ON contacts(institution);

-- Create index on priority for filtering
CREATE INDEX IF NOT EXISTS idx_contacts_priority ON contacts(priority);
