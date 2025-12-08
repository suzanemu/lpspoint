-- Add column to tournaments table to control screenshot submissions
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS screenshot_submissions_enabled boolean NOT NULL DEFAULT true;