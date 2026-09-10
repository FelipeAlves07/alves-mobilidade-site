-- ============================================================================
-- MIGRAÇÃO: Tabelas de Recibos (Receipts) e Contadores
-- AME Controll — Gate 3
-- ============================================================================

-- 1. Tabela de contadores por ano para numeração atômica NNNN/AAAA
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.receipt_counters (
  year integer NOT NULL PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.receipt_counters IS 'Contadores por ano para numeração de recibos NNNN/AAAA';

-- 2. Função atômica para alocar próximo número de recibo
-- ============================================================================
CREATE OR REPLACE FUNCTION public.next_receipt_number(p_year integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next integer;
BEGIN
  -- Incrementa atomicamente e retorna o novo valor
  INSERT INTO public.receipt_counters (year, last_number)
  VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = receipt_counters.last_number + 1,
        updated_at = now()
  RETURNING last_number INTO v_next;

  RETURN v_next;
END;
$$;

COMMENT ON FUNCTION public.next_receipt_number(integer) IS 'Aloca atomicamente o próximo número sequencial do recibo para o ano informado';

-- 3. Tabela principal de recibos
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number text NOT NULL UNIQUE,           -- formato "NNNN/AAAA" (ex: "0487/2026")
  trip_id uuid,                          -- FK opcional para trips

  client_name text NOT NULL,
  client_phone text,

  service_date date NOT NULL,
  service_description text NOT NULL,
  payment_method text NOT NULL,          -- "Pix" | "Dinheiro" | "Cartão de crédito" | "Cartão de débito" | "Transferência" | "Outro"

  value numeric(12,2) NOT NULL,          -- valor em REAIS (ex: 140.00 = R$ 140,00)
  observations text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

COMMENT ON TABLE public.receipts IS 'Recibos emitidos pela AME';

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_receipts_trip_id ON public.receipts (trip_id);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON public.receipts (number);
CREATE INDEX IF NOT EXISTS idx_receipts_service_date ON public.receipts (service_date);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON public.receipts (created_at DESC);

-- 4. Foreign Key para trips (se a tabela trips existir)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'trips'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_receipts_trip_id'
    ) THEN
      ALTER TABLE public.receipts
      ADD CONSTRAINT fk_receipts_trip_id
      FOREIGN KEY (trip_id) REFERENCES public.trips(id)
      ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 5. Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_counters ENABLE ROW LEVEL SECURITY;

-- Policy: admins autenticados podem ler/escrever tudo
-- Ajuste conforme sua política de auth real
CREATE POLICY "Admins podem gerenciar recibos"
  ON public.receipts
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins podem gerenciar contadores"
  ON public.receipt_counters
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 6. Trigger para updated_at automático
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_receipts_updated_at ON public.receipts;
CREATE TRIGGER trigger_receipts_updated_at
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================