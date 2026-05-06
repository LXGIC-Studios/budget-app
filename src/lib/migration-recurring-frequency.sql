-- Migration: add frequency and start_date to scheduled_transactions
-- Run this in the Supabase SQL editor

ALTER TABLE scheduled_transactions
  ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS start_date DATE;

-- Backfill existing rows to monthly (they are all monthly)
UPDATE scheduled_transactions SET frequency = 'monthly' WHERE frequency IS NULL OR frequency = '';
