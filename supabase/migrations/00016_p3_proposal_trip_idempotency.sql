-- ============================================================
-- AME Control — P3.1: Proposal → Trip Idempotency
-- ============================================================

-- 1. Adicionar proposal_id à tabela trips
-- Cada viagem pode ser vinculada a uma proposta
ALTER TABLE trips ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES proposals(id) ON DELETE SET NULL;

-- 2. UNIQUE constraint em trips.proposal_id
-- Garante NO MÁXIMO uma viagem por proposta (proteção DB-level atômica)
-- Se dispositivo A e B tentarem criar trips para a mesma proposal,
-- o segundo INSERT recebe unique_violation e o frontend retorna a trip existente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trips_proposal_id_unique'
  ) THEN
    ALTER TABLE trips
      ADD CONSTRAINT trips_proposal_id_unique
      UNIQUE (proposal_id);
  END IF;
END $$;

-- 3. Índice para lookup rápido por proposal_id (usado no retry/idempotência)
CREATE INDEX IF NOT EXISTS idx_trips_proposal_id ON trips(proposal_id);
