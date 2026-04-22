BEGIN;

-- Core events table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  location text,
  event_date date,
  start_time text,
  end_time text,
  prize_pool text,
  sponsors text,
  is_active boolean NOT NULL DEFAULT false,
  registration_open boolean NOT NULL DEFAULT true,
  max_team_size integer NOT NULL DEFAULT 4,
  min_team_size integer NOT NULL DEFAULT 2,
  banner_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Event tracks (problem statements) — one per event
CREATE TABLE IF NOT EXISTS public.event_tracks (
  id text NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  max_teams integer NOT NULL DEFAULT 10,
  current_count integer NOT NULL DEFAULT 0,
  max_capacity integer NOT NULL DEFAULT 10,
  PRIMARY KEY (id, event_id)
);

-- Seed a default "Eclipse 2026" event (maps to the existing single-event setup)
INSERT INTO public.events (
  id,
  name,
  slug,
  description,
  location,
  event_date,
  start_time,
  end_time,
  prize_pool,
  sponsors,
  is_active,
  registration_open,
  max_team_size,
  min_team_size,
  banner_text
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Eclipse 2026',
  'eclipse-2026',
  'A 10-hour hackathon hosted by the Department of AIML x CodeChef PESU ECC. 6 problem statements. You pick one. Build a solution. Ship it in 10 hours.',
  'MRD Auditorium, PES University',
  '2026-03-28',
  '8:00 AM',
  '6:00 PM',
  'Rs 35000+',
  'C-DAC, Zintoo',
  true,
  true,
  4,
  2,
  'First come, first served. Seats are limited.'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
