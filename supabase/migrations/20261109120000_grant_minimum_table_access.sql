-- Acesso mínimo de tabela para o aplicativo.
--
-- No projeto Supabase as permissões padrão de tabelas criadas por
-- `postgres` não concedem SELECT/INSERT/UPDATE/DELETE a `anon` nem a
-- `authenticated` (só TRUNCATE, REFERENCES e TRIGGER). As migrations 1–5
-- supõem o padrão antigo do Supabase e não concedem SELECT explícito, exceto
-- em stock_items (migration 2). Sem este GRANT, toda leitura do app falharia
-- com "permission denied" antes mesmo de o RLS filtrar linhas.
--
-- Esta migration concede somente o que src/services/dataService.ts lê pelo
-- PostgREST; o RLS das migrations 1, 2 e 4 continua limitando as linhas.
-- Escrita direta permanece revogada (tudo via RPC), com as exceções já
-- previstas na migration 1 (profiles por coluna, notifications.read_at,
-- user_settings). audit_logs continua sem acesso pelo cliente.
--
-- Também corrige cancel_request: a RPC não verificava se a conta do aluno
-- está ativa; a proteção existia só no cliente.

begin;

-- Menor privilégio: privilégios padrão que o app não usa.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
revoke all on all tables in schema public from anon;

grant select on table
  public.profiles,
  public.enrollments,
  public.collection_points,
  public.donations,
  public.requests,
  public.request_items,
  public.request_events,
  public.pickup_codes,
  public.deliveries,
  public.stock_movements,
  public.notifications,
  public.support_tickets,
  public.user_settings
to authenticated;

-- stock_items mantém o grant por coluna da migration 2 (sem location,
-- school, donor_name, received_at). audit_logs: nenhum acesso ao cliente.
revoke all on table public.audit_logs from anon, authenticated;

-- cancel_request: exige conta ativa, como as demais RPCs operacionais.
create or replace function public.cancel_request(p_request_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.requests;
  v_student_id uuid;
begin
  if not public.current_user_is_active() then
    raise exception 'NOT_ALLOWED';
  end if;

  select student_id
    into v_student_id
    from public.requests
   where id = p_request_id
     and student_id = auth.uid();
  if not found then
    raise exception 'BUSINESS_RULE: Esta solicitação não pode mais ser cancelada.';
  end if;

  perform 1
    from public.profiles
   where id = v_student_id
   for update;

  select *
    into v_req
    from public.requests
   where id = p_request_id
     and student_id = auth.uid()
   for update;
  if not found
     or v_req.status not in ('in_review', 'approved', 'separating') then
    raise exception 'BUSINESS_RULE: Esta solicitação não pode mais ser cancelada.';
  end if;

  update public.requests
     set status = 'cancelled'
   where id = p_request_id;
  delete from public.pickup_codes where request_id = p_request_id;
  perform public.audit('cancel_request', 'requests', p_request_id::text);
end $$;

revoke execute on function public.cancel_request(uuid) from public, anon;
grant execute on function public.cancel_request(uuid) to authenticated;

commit;
