-- Endurece as operações críticas sem alterar os contratos públicos das RPCs.
-- Contas bloqueadas mantêm acesso ao perfil, preferências e suporte, mas não
-- aos dados operacionais. Operações que alteram a elegibilidade de um aluno
-- usam o mesmo lock da linha de profiles adquirido por create_request.

begin;

-- Objetos futuros começam sem execução implícita. Cada RPC pública deve receber
-- grant explícito na migration em que for criada.
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

create or replace function public.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and status = 'active'
       and role in ('student', 'donor', 'collector')
  );
$$;

revoke execute on function public.current_user_is_active() from public, anon;
grant execute on function public.current_user_is_active() to authenticated;

-- current_role_is não participa de policies nem é chamada pelo aplicativo.
revoke execute on function public.current_role_is(text) from authenticated;

drop policy if exists "matrícula própria" on public.enrollments;
create policy "matrícula própria de conta ativa"
on public.enrollments for select to authenticated
using (public.current_user_is_active() and student_id = auth.uid());

drop policy if exists "pontos ativos" on public.collection_points;
create policy "pontos para contas ativas"
on public.collection_points for select to authenticated
using (public.current_user_is_active() and is_active);

drop policy if exists "doações próprias ou equipe" on public.donations;
create policy "doações próprias ou equipe ativa"
on public.donations for select to authenticated
using (
  public.current_user_is_active()
  and (donor_id = auth.uid() or public.is_collector())
);

drop policy if exists "pedidos próprios ou equipe" on public.requests;
create policy "pedidos próprios ou equipe ativa"
on public.requests for select to authenticated
using (
  public.current_user_is_active()
  and (student_id = auth.uid() or public.is_collector())
);

drop policy if exists "itens visíveis com o pedido" on public.request_items;
create policy "itens visíveis com o pedido para conta ativa"
on public.request_items for select to authenticated
using (
  public.current_user_is_active()
  and exists (
    select 1
      from public.requests r
     where r.id = request_id
       and (r.student_id = auth.uid() or public.is_collector())
  )
);

drop policy if exists "eventos visíveis com o pedido" on public.request_events;
create policy "eventos visíveis com o pedido para conta ativa"
on public.request_events for select to authenticated
using (
  public.current_user_is_active()
  and exists (
    select 1
      from public.requests r
     where r.id = request_id
       and (r.student_id = auth.uid() or public.is_collector())
  )
);

drop policy if exists "código só do aluno" on public.pickup_codes;
create policy "código só do aluno ativo"
on public.pickup_codes for select to authenticated
using (public.current_user_is_active() and student_id = auth.uid());

drop policy if exists "entregas da equipe ou do aluno" on public.deliveries;
create policy "entregas da equipe ou do aluno ativo"
on public.deliveries for select to authenticated
using (
  public.current_user_is_active()
  and (
    public.is_collector()
    or exists (
      select 1
        from public.requests r
       where r.id = request_id
         and r.student_id = auth.uid()
    )
  )
);

drop policy if exists "notificações próprias" on public.notifications;
create policy "notificações próprias de conta ativa"
on public.notifications for select to authenticated
using (public.current_user_is_active() and user_id = auth.uid());

drop policy if exists "marcar notificações próprias" on public.notifications;
create policy "marcar notificações próprias de conta ativa"
on public.notifications for update to authenticated
using (public.current_user_is_active() and user_id = auth.uid())
with check (public.current_user_is_active() and user_id = auth.uid());

drop policy if exists "comprovantes leitura" on storage.objects;
create policy "comprovantes leitura de conta ativa"
on storage.objects for select to authenticated
using (
  bucket_id = 'delivery-proofs'
  and public.current_user_is_active()
  and (
    public.is_collector()
    or exists (
      select 1
        from public.requests r
       where r.id::text = (storage.foldername(name))[1]
         and r.student_id = auth.uid()
    )
  )
);

create or replace function public.claim_initial_role(p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_role is null or p_role not in ('student', 'donor', 'collector') then
    raise exception 'BUSINESS_RULE: Perfil inválido.';
  end if;
  update public.profiles
     set role = p_role,
         status = case when p_role = 'collector' then 'pending' else 'active' end
   where id = auth.uid()
     and role is null;
  if not found then
    raise exception 'NOT_ALLOWED';
  end if;
  perform public.audit(
    'claim_role',
    'profiles',
    auth.uid()::text,
    jsonb_build_object('role', p_role)
  );
end $$;

create or replace function public.review_donation(
  p_donation_id uuid,
  p_decision text,
  p_note text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_don public.donations;
  v_stock_id uuid;
  v_actor text;
begin
  if not public.is_collector() then
    raise exception 'NOT_ALLOWED';
  end if;
  select *
    into v_don
    from public.donations
   where id = p_donation_id
   for update;
  if not found then
    raise exception 'BUSINESS_RULE: Doação não encontrada.';
  end if;
  if p_decision is null
     or p_decision not in ('approve', 'reject', 'stock')
     or v_don.status in ('rejected', 'stocked')
     or (v_don.status = 'approved' and p_decision <> 'stock') then
    raise exception 'BUSINESS_RULE: Esta mudança de etapa não é permitida.';
  end if;
  if p_decision = 'reject'
     and char_length(coalesce(trim(p_note), '')) < 5 then
    raise exception 'BUSINESS_RULE: Informe o motivo da recusa.';
  end if;

  update public.donations
     set status = case p_decision
                    when 'approve' then 'approved'
                    when 'reject' then 'rejected'
                    else 'stocked'
                  end,
         review_note = coalesce(left(trim(p_note), 300), review_note),
         reviewed_by = auth.uid()
   where id = p_donation_id;

  if p_decision = 'stock' then
    select full_name
      into v_actor
      from public.profiles
     where id = auth.uid();
    select id
      into v_stock_id
      from public.stock_items
     where category = v_don.category
     order by quantity desc
     limit 1
     for update;
    if v_stock_id is null then
      insert into public.stock_items (
        category,
        sizes,
        quantity,
        condition,
        location,
        donor_name
      )
      values (
        v_don.category,
        array[v_don.size],
        v_don.quantity,
        v_don.condition,
        'Estoque A',
        split_part(v_don.donor_name, ' ', 1) || ' '
          || left(split_part(v_don.donor_name, ' ', 2), 1) || '.'
      )
      returning id into v_stock_id;
    else
      update public.stock_items
         set quantity = quantity + v_don.quantity,
             sizes = case
                       when v_don.size = any (sizes) then sizes
                       else sizes || v_don.size
                     end,
             received_at = now()
       where id = v_stock_id;
    end if;
    insert into public.stock_movements (
      stock_item_id,
      label,
      type,
      quantity,
      from_location,
      to_location,
      responsible_id,
      responsible_name
    )
    values (
      v_stock_id,
      v_don.category || ' Tam. ' || v_don.size,
      'in',
      v_don.quantity,
      'Triagem',
      'Estoque A',
      auth.uid(),
      v_actor
    );
    perform public.notify(
      v_don.donor_id,
      'Sua doação já está no estoque',
      'Protocolo ' || v_don.protocol || ': obrigado por ajudar estudantes!',
      'success'
    );
  elsif p_decision = 'reject' then
    perform public.notify(
      v_don.donor_id,
      'Doação não aprovada',
      'Protocolo ' || v_don.protocol || ': ' || trim(p_note),
      'info'
    );
  end if;
  perform public.audit(
    'review_donation',
    'donations',
    p_donation_id::text,
    jsonb_build_object('decision', p_decision)
  );
end $$;

create or replace function public.advance_request(
  p_request_id uuid,
  p_status text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.requests;
  v_student_id uuid;
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

  update public.requests
     set status = p_status
   where id = p_request_id;

  if p_status = 'approved' then
    update public.request_items ri
       set quantity_approved = least(
             ri.quantity_requested,
             coalesce((
               select sum(quantity)
                 from public.stock_items s
                where s.category = ri.category
             ), 0)
           )
     where ri.request_id = p_request_id;
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

create or replace function public.cancel_request(p_request_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.requests;
  v_student_id uuid;
begin
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

create or replace function public.confirm_delivery(
  p_request_id uuid,
  p_code text,
  p_photo_path text,
  p_signature_path text
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.requests;
  v_code public.pickup_codes;
  v_actor text;
  v_item public.request_items;
  v_left int;
  v_stock record;
  v_student_id uuid;
begin
  if not public.is_collector() then
    raise exception 'NOT_ALLOWED';
  end if;

  select student_id
    into v_student_id
    from public.requests
   where id = p_request_id;
  if not found then
    raise exception 'BUSINESS_RULE: O pedido ainda não está pronto para entrega.';
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
  if not found or v_req.status <> 'ready' then
    raise exception 'BUSINESS_RULE: O pedido ainda não está pronto para entrega.';
  end if;

  if p_photo_path is distinct from (p_request_id::text || '/itens.jpg')
     or p_signature_path is distinct from (p_request_id::text || '/assinatura.svg') then
    raise exception 'NOT_ALLOWED';
  end if;

  select *
    into v_code
    from public.pickup_codes
   where request_id = p_request_id
   for update;
  if not found or v_code.failed_attempts >= 5 then
    return 'locked';
  end if;
  if v_code.code is distinct from p_code then
    update public.pickup_codes
       set failed_attempts = failed_attempts + 1
     where request_id = p_request_id;
    perform public.audit(
      'pickup_code_invalid',
      'requests',
      p_request_id::text
    );
    return 'invalid';
  end if;

  if not exists (
    select 1
      from storage.objects
     where bucket_id = 'delivery-proofs'
       and name = p_photo_path
  ) then
    raise exception 'BUSINESS_RULE: Foto da entrega não encontrada.';
  end if;
  if not exists (
    select 1
      from storage.objects
     where bucket_id = 'delivery-proofs'
       and name = p_signature_path
  ) then
    raise exception 'BUSINESS_RULE: Assinatura da entrega não encontrada.';
  end if;

  select full_name
    into v_actor
    from public.profiles
   where id = auth.uid();
  for v_item in
    select *
      from public.request_items
     where request_id = p_request_id
       and quantity_approved > 0
  loop
    v_left := v_item.quantity_approved;
    for v_stock in
      select id, quantity
        from public.stock_items
       where category = v_item.category
         and quantity > 0
       order by quantity desc
       for update
    loop
      exit when v_left = 0;
      update public.stock_items
         set quantity = quantity - least(v_left, v_stock.quantity)
       where id = v_stock.id;
      insert into public.stock_movements (
        stock_item_id,
        label,
        type,
        quantity,
        from_location,
        to_location,
        responsible_id,
        responsible_name
      )
      values (
        v_stock.id,
        v_item.category || ' Tam. ' || v_item.size,
        'out',
        least(v_left, v_stock.quantity),
        'Estoque',
        'Entrega ' || v_req.protocol,
        auth.uid(),
        v_actor
      );
      v_left := v_left - least(v_left, v_stock.quantity);
    end loop;
    if v_left > 0 then
      raise exception 'BUSINESS_RULE: Estoque insuficiente para concluir a entrega.';
    end if;
  end loop;

  insert into public.deliveries (
    request_id,
    receipt_number,
    photo_path,
    signature_path,
    collector_id,
    collector_name
  )
  values (
    p_request_id,
    public.new_protocol('ENT'),
    p_photo_path,
    p_signature_path,
    auth.uid(),
    v_actor
  );
  update public.requests
     set status = 'delivered'
   where id = p_request_id;
  insert into public.request_events (request_id, label)
  values (p_request_id, 'Retirada realizada');
  delete from public.pickup_codes where request_id = p_request_id;
  perform public.notify(
    v_req.student_id,
    'Retirada confirmada',
    'Bons estudos! O comprovante do pedido ' || v_req.protocol || ' está disponível.',
    'success'
  );
  perform public.audit('confirm_delivery', 'requests', p_request_id::text);
  return 'ok';
end $$;

-- Índices vinculados a filtros existentes nas RPCs e no snapshot do usuário.
create index if not exists requests_student_status_id_idx
  on public.requests (student_id, status, id);
create index if not exists request_items_category_request_idx
  on public.request_items (category, request_id);
create index if not exists donations_donor_created_idx
  on public.donations (donor_id, created_at desc);
create index if not exists support_tickets_user_created_idx
  on public.support_tickets (user_id, created_at desc);

-- Os compostos acima preservam o prefixo dos índices simples e também atendem
-- aos filtros adicionais, evitando custo duplicado de escrita.
drop index if exists public.requests_student;
drop index if exists public.donations_donor;

revoke execute on function public.claim_initial_role(text) from public, anon;
revoke execute on function public.review_donation(uuid, text, text) from public, anon;
revoke execute on function public.advance_request(uuid, text) from public, anon;
revoke execute on function public.cancel_request(uuid) from public, anon;
revoke execute on function public.confirm_delivery(uuid, text, text, text) from public, anon;

grant execute on function public.claim_initial_role(text) to authenticated;
grant execute on function public.review_donation(uuid, text, text) to authenticated;
grant execute on function public.advance_request(uuid, text) to authenticated;
grant execute on function public.cancel_request(uuid) to authenticated;
grant execute on function public.confirm_delivery(uuid, text, text, text) to authenticated;

commit;
