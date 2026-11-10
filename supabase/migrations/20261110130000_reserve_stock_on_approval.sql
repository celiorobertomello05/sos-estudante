-- Reserva de estoque na aprovação.
--
-- Antes: a aprovação calculava quantity_approved só contra o estoque total da
-- categoria, sem descontar o que já estava aprovado para outros pedidos. Dois
-- pedidos aprovados podiam somar mais que o estoque, e a falta só aparecia na
-- entrega (confirm_delivery).
--
-- Agora (reserva lógica, sem tabela nova):
-- * disponível = estoque da categoria − quantity_approved de outros pedidos em
--   'approved', 'separating' ou 'ready' (o estoque só baixa na entrega);
-- * aprovar limita cada item ao disponível e recusa a aprovação quando nenhum
--   item tem saldo;
-- * marcar 'ready' confere de novo se o estoque cobre todas as reservas da
--   categoria (ajustes manuais podem ter reduzido o estoque);
-- * as linhas de stock_items das categorias do pedido ficam travadas durante a
--   decisão, para dois coletores não aprovarem o mesmo saldo ao mesmo tempo.
-- O estoque continua por categoria; controle por tamanho pode vir depois.

begin;

create or replace function public.reserved_stock(p_category text, p_exclude_request uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(ri.quantity_approved), 0)::int
    from public.request_items ri
    join public.requests r on r.id = ri.request_id
   where ri.category = p_category
     and r.status in ('approved', 'separating', 'ready')
     and r.id is distinct from p_exclude_request;
$$;

revoke execute on function public.reserved_stock(text, uuid) from public, anon, authenticated;

create or replace function public.advance_request(
  p_request_id uuid,
  p_status text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.requests;
  v_student_id uuid;
  v_item record;
  v_stock int;
  v_reserved int;
  v_approved_total int;
begin
  if not public.is_collector() then
    raise exception 'NOT_ALLOWED';
  end if;

  select student_id
    into v_student_id
    from public.requests
   where id = p_request_id;
  if not found then
    raise exception 'BUSINESS_RULE: Esta mudança de etapa não é permitida.';
  end if;

  perform 1
    from public.profiles
   where id = v_student_id
   for update;

  select *
    into v_req
    from public.requests
   where id = p_request_id
   for update;
  if not found or p_status is null or not (
       (v_req.status = 'in_review' and p_status in ('approved', 'cancelled'))
    or (v_req.status = 'approved' and p_status in ('separating', 'cancelled'))
    or (v_req.status = 'separating' and p_status in ('ready', 'cancelled'))
  ) then
    raise exception 'BUSINESS_RULE: Esta mudança de etapa não é permitida.';
  end if;

  if p_status in ('approved', 'ready') then
    -- Serializa decisões que disputam o mesmo saldo.
    perform 1
      from public.stock_items s
     where s.category in (select ri.category from public.request_items ri where ri.request_id = p_request_id)
     order by s.id
       for update;
  end if;

  if p_status = 'approved' then
    for v_item in
      select ri.id, ri.category, ri.quantity_requested
        from public.request_items ri
       where ri.request_id = p_request_id
       order by ri.category, ri.size
    loop
      select coalesce(sum(quantity), 0) into v_stock
        from public.stock_items where category = v_item.category;
      -- Itens anteriores deste mesmo pedido já reservados neste laço contam.
      v_reserved := public.reserved_stock(v_item.category, p_request_id)
        + coalesce((
            select sum(quantity_approved) from public.request_items
             where request_id = p_request_id and category = v_item.category and id <> v_item.id
          ), 0);
      update public.request_items
         set quantity_approved = greatest(0, least(v_item.quantity_requested, v_stock - v_reserved))
       where id = v_item.id;
    end loop;

    select coalesce(sum(quantity_approved), 0) into v_approved_total
      from public.request_items where request_id = p_request_id;
    if v_approved_total = 0 then
      raise exception 'BUSINESS_RULE: Sem estoque disponível para aprovar esta solicitação. O saldo já está reservado para outros pedidos.';
    end if;
  elsif p_status = 'ready' then
    for v_item in
      select ri.category, sum(ri.quantity_approved)::int as approved
        from public.request_items ri
       where ri.request_id = p_request_id
       group by ri.category
    loop
      select coalesce(sum(quantity), 0) into v_stock
        from public.stock_items where category = v_item.category;
      if v_stock < v_item.approved + public.reserved_stock(v_item.category, p_request_id) then
        raise exception 'BUSINESS_RULE: O estoque atual não cobre as reservas desta categoria. Ajuste o estoque ou cancele um pedido antes de marcar como pronto.';
      end if;
    end loop;
  end if;

  update public.requests
     set status = p_status
   where id = p_request_id;

  if p_status = 'approved' then
    insert into public.request_events (request_id, label)
    values (p_request_id, 'Solicitação analisada');
    perform public.notify(
      v_req.student_id,
      'Pedido aprovado!',
      'Sua solicitação ' || v_req.protocol || ' foi aprovada e está em preparação.',
      'success'
    );
  elsif p_status = 'separating' then
    insert into public.request_events (request_id, label)
    values (p_request_id, 'Itens separados');
  elsif p_status = 'ready' then
    insert into public.request_events (request_id, label)
    values
      (p_request_id, 'Kit preparado'),
      (p_request_id, 'Pronto para retirada');
    perform public.notify(
      v_req.student_id,
      'Kit pronto para retirada',
      'Leve seu código de retirada ao ponto escolhido.',
      'info'
    );
  else
    delete from public.pickup_codes where request_id = p_request_id;
    perform public.notify(
      v_req.student_id,
      'Solicitação cancelada',
      'O pedido ' || v_req.protocol || ' foi cancelado pela equipe.',
      'info'
    );
  end if;
  perform public.audit(
    'advance_request',
    'requests',
    p_request_id::text,
    jsonb_build_object('status', p_status)
  );
end $$;

revoke execute on function public.advance_request(uuid, text) from public, anon;
grant execute on function public.advance_request(uuid, text) to authenticated;

commit;
