-- Tabela chave-valor de infraestrutura (versão 20261105161722), mantida para o
-- histórico local ficar igual ao do banco. RLS ligado e sem policies: o app
-- mobile não tem acesso.
-- Idempotente: não altera nada onde a tabela já existe.

create table if not exists public.kv_store_9a75af9f (
  key text not null primary key,
  value jsonb not null
);

alter table public.kv_store_9a75af9f enable row level security;
