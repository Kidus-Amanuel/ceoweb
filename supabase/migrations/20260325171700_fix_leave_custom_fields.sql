-- Migration to add missing custom_fields column to leave_types and leaves tables
-- These were missed due to CREATE TABLE IF NOT EXISTS in previous migrations

ALTER TABLE public.leave_types 
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::JSONB;

ALTER TABLE public.leaves 
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::JSONB;

-- Refresh PostgREST cache (Supabase specific, if running via local CLI might need to restart or use RPC)
-- This is just for documentation, the user usually needs to reload their local Supabase or wait for cache refresh.
