-- Preserva a elegibilidade aprovada e restringe o tratamento de unique_violation
-- à constraint que realmente representa itens repetidos na solicitação.

begin;

create or replace function public.create_request(
  p_items jsonb,
  p_point_id uuid,
  p_notes text
) returns public.requests
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
  v_enrollment public.enrollments;
  v_row public.requests;
  v_item jsonb;
  v_qty int;
  v_category text;
  v_request_id uuid;
  v_latest_delivered_at timestamptz;
  v_eligible_at timestamptz;
  v_now timestamptz := now();
  v_unique_constraint text;
begin
  if auth.uid() is null then
    raise exception 'NOT_ALLOWED';
  end if;

  -- Todas as chamadas deste aluno disputam a mesma linha até o fim da transação.
  select *
    into v_profile
    from public.profiles
   where id = auth.uid()
   for update;

  if not found
     or v_profile.role is distinct from 'student'
     or v_profile.status <> 'active' then
    raise exception 'NOT_ALLOWED';
  end if;

  select *
    into v_enrollment
    from public.enrollments
   where student_id = auth.uid()
     and is_active
     and status = 'verified';

  if not found then
    raise exception 'BUSINESS_RULE: Envie e valide sua declaração de matrícula antes de solicitar.';
  end if;

  if (
    select count(*)
      from public.requests
     where student_id = auth.uid()
       and status not in ('delivered', 'cancelled')
  ) >= 3 then
    raise exception 'BUSINESS_RULE: Você pode ter até 3 solicitações em andamento.';
  end if;

  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'BUSINESS_RULE: Cada solicitação aceita de 1 a 5 itens.';
  end if;
  if jsonb_array_length(p_items) not between 1 and 5 then
    raise exception 'BUSINESS_RULE: Cada solicitação aceita de 1 a 5 itens.';
  end if;

  if not exists (
    select 1
      from public.collection_points
     where id = p_point_id
       and is_active
  ) then
    raise exception 'BUSINESS_RULE: Ponto de retirada indisponível.';
  end if;

  -- Categorias repetidas continuam nos itens; são deduplicadas apenas nesta regra.
  for v_category in
    select distinct requested.item ->> 'category'
      from jsonb_array_elements(p_items) as requested(item)
  loop
    if v_category is null
       or v_category not in ('camisa', 'calca', 'agasalho', 'kit', 'shorts', 'jaqueta') then
      raise exception 'BUSINESS_RULE: Categoria inválida.';
    end if;

    -- Uma entrega marcada como concluída sem comprovante impede decisão insegura.
    select r.id
      into v_request_id
      from public.requests r
      join public.request_items ri on ri.request_id = r.id
      left join public.deliveries d on d.request_id = r.id
     where r.student_id = auth.uid()
       and r.status = 'delivered'
       and ri.category = v_category
       and d.delivered_at is null
     order by r.created_at desc
     limit 1;

    if found then
      raise exception 'BUSINESS_RULE: Há uma entrega concluída sem data válida. Procure o atendimento para corrigir o histórico.';
    end if;

    select r.id
      into v_request_id
      from public.requests r
      join public.request_items ri on ri.request_id = r.id
     where r.student_id = auth.uid()
       and r.status not in ('delivered', 'cancelled')
       and ri.category = v_category
     order by r.created_at desc
     limit 1;

    if found then
      raise exception 'BUSINESS_RULE: Esta categoria já está em outra solicitação em andamento.';
    end if;

    -- delivered_at é timestamptz; ausência já foi tratada acima.
    select r.id, d.delivered_at
      into v_request_id, v_latest_delivered_at
      from public.requests r
      join public.request_items ri on ri.request_id = r.id
      join public.deliveries d on d.request_id = r.id
     where r.student_id = auth.uid()
       and r.status = 'delivered'
       and ri.category = v_category
     order by d.delivered_at desc, r.id desc
     limit 1;

    if found then
      -- Converte para UTC antes de somar meses de calendário e volta a timestamptz.
      v_eligible_at :=
        ((v_latest_delivered_at at time zone 'UTC') + interval '6 months')
        at time zone 'UTC';

      -- A igualdade é permitida: somente instantes anteriores ficam bloqueados.
      if v_now < v_eligible_at then
        raise exception 'BUSINESS_RULE: Esta categoria ainda está no período de seis meses desde a última entrega.';
      end if;
    end if;
  end loop;

  insert into public.requests (
    protocol,
    student_id,
    student_name,
    school_name,
    contact_masked,
    point_id,
    pickup_at,
    notes
  )
  values (
    public.new_protocol('SOL'),
    auth.uid(),
    v_profile.full_name,
    v_enrollment.school_name,
    case
      when v_profile.phone is null then 'Protegido'
      else '(**) *****-**' || right(v_profile.phone, 2)
    end,
    p_point_id,
    now() + interval '3 days',
    nullif(left(trim(p_notes), 300), '')
  )
  returning * into v_row;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty not between 1 and 5 then
      raise exception 'BUSINESS_RULE: A quantidade por item deve ficar entre 1 e 5.';
    end if;
    if coalesce((
      select sum(quantity)
        from public.stock_items
       where category = v_item ->> 'category'
    ), 0) < v_qty then
      raise exception 'BUSINESS_RULE: Estoque insuficiente para um dos itens.';
    end if;
    insert into public.request_items (
      request_id,
      category,
      size,
      quantity_requested
    )
    values (
      v_row.id,
      v_item ->> 'category',
      left(v_item ->> 'size', 10),
      v_qty
    );
  end loop;

  insert into public.request_events (request_id, label)
  values (v_row.id, 'Solicitação enviada');

  insert into public.pickup_codes (request_id, student_id, code)
  values (v_row.id, auth.uid(), public.random_pickup_code());

  perform public.notify(
    auth.uid(),
    'Solicitação enviada',
    'Protocolo ' || v_row.protocol || ' em análise.',
    'success'
  );
  perform public.audit('create_request', 'requests', v_row.id::text);
  return v_row;
exception
  when unique_violation then
    get stacked diagnostics v_unique_constraint = constraint_name;
    if v_unique_constraint = 'request_items_request_id_category_size_key' then
      raise exception 'BUSINESS_RULE: Há itens repetidos na solicitação.';
    end if;
    raise;
end $$;

revoke execute on function public.create_request(jsonb, uuid, text)
from public, anon;
grant execute on function public.create_request(jsonb, uuid, text)
to authenticated;

commit;
