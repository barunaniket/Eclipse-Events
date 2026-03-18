BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  member_index integer NOT NULL CHECK (member_index >= 1),
  receipt_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_receipts_team_member_idx
  ON public.payment_receipts(team_id, member_index);

COMMIT;
