BEGIN;

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  date date,
  start_time time,
  end_time time,
  location text,
  prize_pool text,
  sponsors text,
  max_teams integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT false,
  is_registration_open boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only service role / admin can write
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on events"
  ON public.events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed default event from existing system
INSERT INTO public.events (
  name, description, date, start_time, end_time, location, prize_pool, sponsors,
  max_teams, is_active, is_registration_open
) VALUES (
  'Eclipse 2026',
  'Official hackathon event hosted by the Department of AIML x CodeChef.',
  '2026-03-28',
  '08:00',
  '18:00',
  'MRD Auditorium, PES University',
  'Rs 35000+',
  'C-DAC, Zintoo',
  60,
  false,
  true
) ON CONFLICT DO NOTHING;

COMMIT;
