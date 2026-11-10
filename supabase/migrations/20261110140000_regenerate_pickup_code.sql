-- Novo código de retirada pelo próprio estudante.
--
-- confirm_delivery bloqueia o código após 5 tentativas erradas e não havia
-- como desbloquear: a entrega ficava presa. O desbloqueio é feito pelo dono do
-- pedido, que gera um código novo (as tentativas voltam a zero). A equipe não
-- pode reiniciar tentativas: isso permitiria continuar adivinhando o código
-- no balcão. Também serve para o estudante trocar um código que vazou.

begin;

create or replace function public.regenerate_pickup_code(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.requests;
begin
  if not public.current_role_is('student') then
    raise exception 'NOT_ALLOWED';
  end if;

  -- Mesmo lock por aluno das demais operações sobre pedidos.
  perform 1 from public.profiles where id = auth.uid() for update;

  select * into v_req
    from public.requests
   where id = p_request_id and student_id = auth.uid()
   for update;
  if not found or v_req.status not in ('approved', 'separating', 'ready') then
    raise exception 'BUSINESS_RULE: Só é possível gerar um novo código para pedidos aprovados e ainda não entregues.';
  end if;

  insert into public.pickup_codes (request_id, student_id, code, failed_attempts)
  values (p_request_id, auth.uid(), public.random_pickup_code(), 0)
  on conflict (request_id) do update
     set code = excluded.code,
         failed_attempts = 0,
         created_at = now();

  perform public.audit('regenerate_pickup_code', 'pickup_codes', p_request_id::text);
end $$;

revoke execute on function public.regenerate_pickup_code(uuid) from public, anon;
grant execute on function public.regenerate_pickup_code(uuid) to authenticated;

commit;
