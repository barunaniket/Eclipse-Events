BEGIN;

-- Add capacity tracking to tracks
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS current_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_capacity integer NOT NULL DEFAULT 60;

UPDATE tracks SET current_count = 0 WHERE current_count IS NULL;
UPDATE tracks SET max_capacity = 60 WHERE max_capacity IS NULL;

-- Reset registration data
TRUNCATE TABLE candidates;
TRUNCATE TABLE teams;
ALTER SEQUENCE teams_team_number_seq RESTART WITH 1;

-- Atomic team registration with capacity check
CREATE OR REPLACE FUNCTION public.register_team_with_capacity_check(
  p_team_name text,
  p_track_id uuid,
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
