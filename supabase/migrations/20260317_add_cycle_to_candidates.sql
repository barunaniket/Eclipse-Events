BEGIN;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS cycle text;

COMMIT;
