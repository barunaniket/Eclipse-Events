BEGIN;

-- Ensure tracks.id and teams.track_id are TEXT so we can use ps1-style IDs
DO $$
DECLARE
  pkname text;
  fkname text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tracks'
      AND column_name = 'id'
      AND data_type <> 'text'
  ) THEN
    SELECT constraint_name INTO pkname
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'tracks'
      AND constraint_type = 'PRIMARY KEY';

    IF pkname IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.tracks DROP CONSTRAINT %I', pkname);
    END IF;

    SELECT tc.constraint_name INTO fkname
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'teams'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'track_id';

    IF fkname IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.teams DROP CONSTRAINT %I', fkname);
    END IF;

    ALTER TABLE public.tracks
      ALTER COLUMN id TYPE text USING id::text;

    ALTER TABLE public.teams
      ALTER COLUMN track_id TYPE text USING track_id::text;
  END IF;

  SELECT constraint_name INTO pkname
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND table_name = 'tracks'
    AND constraint_type = 'PRIMARY KEY';

  IF pkname IS NULL THEN
    EXECUTE 'ALTER TABLE public.tracks ADD PRIMARY KEY (id)';
  END IF;

  SELECT tc.constraint_name INTO fkname
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'teams'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'track_id';

  IF fkname IS NULL THEN
    EXECUTE 'ALTER TABLE public.teams ADD CONSTRAINT teams_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id)';
  END IF;
END $$;

-- Add capacity tracking to tracks
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS current_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_capacity integer NOT NULL DEFAULT 60;

UPDATE tracks SET current_count = 0 WHERE current_count IS NULL;
UPDATE tracks SET max_capacity = COALESCE(max_teams, 60) WHERE max_capacity IS NULL;

-- Reset registration data
TRUNCATE TABLE candidates, teams, tracks RESTART IDENTITY CASCADE;

-- Seed tracks with ps* IDs
INSERT INTO tracks (id, title, description, max_teams, current_count, max_capacity) VALUES
('ps1', '1. FinTech & Web3 Security', 'Develop a decentralized tracing mechanism...', 10, 0, 10),
('ps2', '2. AI-Driven Healthcare Diagnostics', 'Build an agentic AI model...', 10, 0, 10),
('ps3', '3. Campus Community Hub (Open Innovation)', 'Design a full-stack platform...', 10, 0, 10),
('ps4', '4. Algorithmic Supply Chain Optimization', 'Develop a predictive algorithm...', 10, 0, 10),
('ps5', '5. Quantum Cryptography Simulator', 'Create a simulation environment...', 10, 0, 10),
('ps6', '6. Gamified Education for Neurodivergent Learners', 'Design an interactive application...', 10, 0, 10);

-- Atomic team registration with capacity check
DROP FUNCTION IF EXISTS public.register_team_with_capacity_check(
  p_team_name text,
  p_track_id text,
  p_team_size integer,
  p_receipt_url text
);

DROP FUNCTION IF EXISTS public.register_team_with_capacity_check(
  p_team_name text,
  p_track_id uuid,
  p_team_size integer,
  p_receipt_url text
);

CREATE OR REPLACE FUNCTION public.register_team_with_capacity_check(
  p_team_name text,
  p_track_id text,
  p_team_size integer,
  p_receipt_url text
)
RETURNS TABLE (new_team_id uuid, new_team_number integer)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_count integer;
  v_max_capacity integer;
  v_team_id uuid;
  v_team_number integer;
BEGIN
  SELECT current_count, max_capacity
    INTO v_current_count, v_max_capacity
    FROM tracks
    WHERE id = p_track_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_TRACK';
  END IF;

  IF v_current_count >= v_max_capacity THEN
    RAISE EXCEPTION 'TRACK_FULL';
  END IF;

  INSERT INTO teams (team_name, track_id, team_size, receipt_url, payment_status)
  VALUES (p_team_name, p_track_id, p_team_size, p_receipt_url, 'pending')
  RETURNING id, team_number INTO v_team_id, v_team_number;

  UPDATE tracks
    SET current_count = current_count + 1
    WHERE id = p_track_id;

  RETURN QUERY SELECT v_team_id, v_team_number;
END;
$$;

COMMIT;
