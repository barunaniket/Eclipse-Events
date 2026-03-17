BEGIN;

CREATE TABLE IF NOT EXISTS public.event_settings (
  id integer PRIMARY KEY,
  is_live boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.event_settings (id, is_live)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

COMMIT;
