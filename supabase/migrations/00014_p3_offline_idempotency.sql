-- ============================================================
-- AME Control — P3: Offline, Idempotência e Sincronização
-- ============================================================

-- 1. Adicionar trip_id à tabela proposals (idempotência proposta→viagem)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES trips(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_trip_id ON proposals(trip_id);

-- 2. Adicionar status à tabela receipts (rascunho/pendente/emitido)
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS status text DEFAULT 'Emitido';
UPDATE receipts SET status = 'Emitido' WHERE status IS NULL;
ALTER TABLE receipts ALTER COLUMN status SET NOT NULL;

-- 3. Adicionar updated_at a tabelas que não possuem
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE trips ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE finance_entries ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4. Triggers para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contacts_updated_at') THEN
    CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_trips_updated_at') THEN
    CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_referrals_updated_at') THEN
    CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_finance_entries_updated_at') THEN
    CREATE TRIGGER update_finance_entries_updated_at BEFORE UPDATE ON finance_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_proposals_updated_at') THEN
    CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_receipts_updated_at') THEN
    CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 5. Constraint único para receipt number (já existente, garantir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'receipts_number_unique') THEN
    ALTER TABLE receipts ADD CONSTRAINT receipts_number_unique UNIQUE (number);
  END IF;
END $$;
