-- ============================================================
-- AME Control - Correcoes operacionais (rodada 1)
-- Alves Mobilidade Executiva
-- ============================================================
-- Aplicar manualmente no SQL Editor (padrao do projeto).
-- Nenhuma alteracao destrutiva: apenas colunas novas + ajuste
-- do CHECK de status de indicacao (valores migrados, nada removido).

-- 1) Endereco do cliente (cadastro em Clientes)
alter table public.contacts
  add column if not exists address text not null default '';

-- 2) Financeiro: categoria operacional (Ganho App, Ganho AME,
--    Alimentacao, Combustivel) + vinculo com a viagem de origem
--    (trip_id ja existe; garante ganho AME sem duplicacao)
alter table public.finance_entries
  add column if not exists category text not null default '';

-- 3) Indicacoes: telefones do indicador/indicado (vincular a
--    viagem concluida de forma confiavel, nao so pelo nome)
alter table public.referrals
  add column if not exists referrer_phone text not null default '';
alter table public.referrals
  add column if not exists referred_phone text not null default '';

-- 4) Status de indicacao: Pendente / Convertida / Cancelada
--    (migra os valores antigos preservando o historico)
alter table public.referrals
  drop constraint if exists referrals_status_check;

update public.referrals
  set status = 'Pendente'
  where status = 'Indicado';

update public.referrals
  set status = 'Convertida'
  where status in ('Transfer realizado', 'Transfer creditado');

alter table public.referrals
  add constraint referrals_status_check
  check (status in ('Pendente', 'Convertida', 'Cancelada'));
