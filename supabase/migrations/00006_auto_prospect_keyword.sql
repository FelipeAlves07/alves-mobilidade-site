-- ============================================================
-- AME Control - Auto Prospect
-- Palavra-chave de busca na campanha (Discovery Automática)
-- Alves Mobilidade Executiva
-- ============================================================

alter table public.ap_campaigns
  add column keyword text not null default '';
