-- Simple account tag on transactions (no separate accounts table needed)
-- Run this in Supabase SQL Editor

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_tag text;
