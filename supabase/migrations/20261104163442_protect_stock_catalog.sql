-- SOS Estudante — Bloco 1: proteção do catálogo de estoque.
--
-- Esta migration mantém o catálogo disponível aos três papéis existentes,
-- desde que o perfil esteja ativo, e restringe o endpoint da tabela às colunas
-- necessárias para consultar disponibilidade. Campos administrativos continuam
-- acessíveis somente a funções security definer já autorizadas pelo seu corpo.

begin;

drop policy if exists "estoque visível" on public.stock_items;
drop policy if exists "catálogo de estoque para contas ativas" on public.stock_items;

create policy "catálogo de estoque para contas ativas"
on public.stock_items
for select
to authenticated
using (
  auth.uid() is not null
  and exists (
    select 1
      from public.profiles
     where profiles.id = auth.uid()
       and profiles.status = 'active'
       and profiles.role in ('student', 'donor', 'collector')
  )
);

-- RLS limita linhas; grants por coluna impedem leitura de location, school,
-- donor_name, received_at e de qualquer coluna administrativa adicionada no
-- futuro. Uma view/RPC adicional não é necessária para este catálogo.
revoke select on table public.stock_items from public, anon, authenticated;

grant select (
  id,
  category,
  sizes,
  quantity,
  condition
) on table public.stock_items to authenticated;

commit;

-- Rollback seguro (criar como migration compensatória, se necessário):
--   1. revogar o select por coluna acima;
--   2. remover a policy "catálogo de estoque para contas ativas";
--   3. manter a tabela sem acesso direto até uma correção posterior.
-- Não restaurar a policy anterior com USING (true) nem o select amplo.
