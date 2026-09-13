-- ============================================================
-- AME Control — P3: Restrições de Integridade para Idempotência
-- ============================================================

-- 1. UNIQUE constraint em proposals.trip_id
-- Garante que cada viagem só pode ter uma proposta convertida
-- (proteção DB-level contra conversão dupla offline)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'proposals_trip_id_unique'
  ) THEN
    ALTER TABLE proposals
      ADD CONSTRAINT proposals_trip_id_unique
      UNIQUE (trip_id);
  END IF;
END $$;

-- 2. Índice parcial único em finance_entries
-- Garante apenas UMA entrada de ganhos_ame por trip_id
-- (proteção DB-level contra duplicação na sincronização)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'finance_entries_trip_ganhos_unique'
  ) THEN
    ALTER TABLE finance_entries
      ADD CONSTRAINT finance_entries_trip_ganhos_unique
      UNIQUE (trip_id, category);
  END IF;
END $$;

-- 3. Trigger para prevenir preview number como receipt number oficial
-- Se number for "Pré-visualização" ou vazio, rejeitar INSERT
CREATE OR REPLACE FUNCTION validate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number IS NOT NULL
     AND NEW.number != ''
     AND NEW.number != 'Pendente'
     AND (NEW.number ILIKE '%pré-visualização%'
          OR NEW.number ILIKE '%preview%')
  THEN
    RAISE EXCEPTION 'Receipt number cannot be a preview number: %', NEW.number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'validate_receipt_number_trigger') THEN
    CREATE TRIGGER validate_receipt_number_trigger
      BEFORE INSERT OR UPDATE ON receipts
      FOR EACH ROW
      EXECUTE FUNCTION validate_receipt_number();
  END IF;
END $$;
