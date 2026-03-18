BEGIN;

-- Add member_index to candidates for receipt matching
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS member_index integer;

-- Backfill member_index per team (leader first), only where missing
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY is_leader DESC, id ASC) AS rn
  FROM public.candidates
)
UPDATE public.candidates c
SET member_index = r.rn
FROM ranked r
WHERE c.id = r.id
  AND c.member_index IS NULL;

-- Reset function for admin clear
CREATE OR REPLACE FUNCTION public.reset_registration_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  TRUNCATE TABLE public.payment_receipts, public.candidates, public.teams RESTART IDENTITY CASCADE;

  INSERT INTO public.tracks (id, title, description, max_teams, current_count, max_capacity) VALUES
  ('ps1', '1. FinTech & Web3 Security', 'Develop a decentralized tracing mechanism...', 10, 0, 10),
  ('ps2', '2. AI-Driven Healthcare Diagnostics', 'Build an agentic AI model...', 10, 0, 10),
  ('ps3', '3. Campus Community Hub (Open Innovation)', 'Design a full-stack platform...', 10, 0, 10),
  ('ps4', '4. Algorithmic Supply Chain Optimization', 'Develop a predictive algorithm...', 10, 0, 10),
  ('ps5', '5. Quantum Cryptography Simulator', 'Create a simulation environment...', 10, 0, 10),
  ('ps6', '6. Gamified Education for Neurodivergent Learners', 'Design an interactive application...', 10, 0, 10)
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    max_teams = EXCLUDED.max_teams,
    current_count = 0,
    max_capacity = EXCLUDED.max_capacity;

  INSERT INTO public.event_settings (id, is_live)
  VALUES (1, false)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

ALTER FUNCTION public.reset_registration_data() OWNER TO postgres;

COMMIT;
