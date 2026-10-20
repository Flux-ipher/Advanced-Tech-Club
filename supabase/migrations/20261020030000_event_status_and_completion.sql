-- Migration: 20261020030000_event_status_and_completion.sql
-- Enables hybrid automatic and admin-controlled event completion tracking

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false;

-- Mark past events as completed
UPDATE public.events
SET is_completed = true
WHERE id IN (
  '3d6d2d58-ef35-4f1e-8027-88a6f0e51399', -- The Cyber Heist (CTF Event)
  '7f4edf24-6236-417c-a545-6131576e33f5'  -- The Jugaad-a-thon
);

-- Index on completion status for fast filtering
CREATE INDEX IF NOT EXISTS idx_events_is_completed ON public.events(is_completed);
