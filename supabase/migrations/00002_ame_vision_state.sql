-- ============================================================
-- AME Vision — Tablet Sync State
-- Sprint 2.2: AME Vision Integration
-- ============================================================

-- Stores the current session state pushed from AME Control to
-- the AME Vision tablet (single-row, id = 'main').

CREATE TABLE IF NOT EXISTS public.ame_vision_state (
  id TEXT PRIMARY KEY DEFAULT 'main',
  status TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle', 'prepared', 'running', 'completed')),
  trip JSONB,
  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ame_vision_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ame_vision_state_select_auth"
  ON public.ame_vision_state FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ame_vision_state_insert_auth"
  ON public.ame_vision_state FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "ame_vision_state_update_auth"
  ON public.ame_vision_state FOR UPDATE
  TO authenticated
  USING (true);

-- Trigger function (created here so migration is self-contained)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ame_vision_state_updated_at
  BEFORE UPDATE ON public.ame_vision_state
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
