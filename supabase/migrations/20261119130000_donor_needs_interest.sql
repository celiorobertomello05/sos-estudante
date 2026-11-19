-- US05, lado do doador: necessidades abertas e demonstração de interesse.
--
-- O estudante já registra a necessidade ao solicitar itens (create_request).
-- Agora o doador vê as necessidades em aberto de forma ANÔNIMA (categoria,
-- tamanho, quantidade e bairro do ponto de retirada; nunca nome, escola ou
-- documento), demonstra interesse em atendê-las e acompanha o status. O
-- estudante recebe um aviso sem identificar o doador.
--
-- need_interests não tem policy nem GRANT: o aplicativo só chega a ela pelas
-- RPCs abaixo, todas restritas a doador com conta ativa.

begin;

create table public.need_interests (
  id uuid primary key default gen_random_uuid(),
  request_item_id uuid not null references public.request_items (id) on delete cascade,
  donor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_item_id, donor_id)
);

create index need_interests_donor_id_idx on public.need_interests (donor_id);

alter table public.need_interests enable row level security;
revoke all on table public.need_interests from anon, authenticated;

-- Necessidades abertas: itens de pedidos ainda não entregues nem cancelados.
create or replace function public.list_open_needs()
returns table (
  need_id uuid,
  category text,
  size text,
  quantity integer,
  district text,
  created_at timestamptz,
  interested_count integer,
  mine boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.current_role_is('donor') then
    raise exception 'NOT_ALLOWED';
  end if;
  return query
    select ri.id, ri.category, ri.size, ri.quantity_requested, cp.district, r.created_at,
           (select count(*)::int from public.need_interests ni where ni.request_item_id = ri.id),
           exists (
             select 1 from public.need_interests ni
              where ni.request_item_id = ri.id and ni.donor_id = auth.uid()
           )
      from public.request_items ri
      join public.requests r on r.id = ri.request_id
      join public.collection_points cp on cp.id = r.point_id
     where r.status in ('in_review', 'approved', 'separating')
     order by r.created_at desc
     limit 100;
end $$;

create or replace function public.express_interest(p_need_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid;
  v_label text;
  v_id uuid;
begin
  if not public.current_role_is('donor') then
    raise exception 'NOT_ALLOWED';
  end if;

  select r.student_id, ri.category
    into v_student, v_label
    from public.request_items ri
    join public.requests r on r.id = ri.request_id
   where ri.id = p_need_id
     and r.status in ('in_review', 'approved', 'separating');
  if not found then
    raise exception 'BUSINESS_RULE: Esta necessidade já foi atendida ou não está mais aberta.';
  end if;

  if (select count(*) from public.need_interests where donor_id = auth.uid()) >= 20 then
    raise exception 'BUSINESS_RULE: Você já demonstrou interesse em 20 necessidades. Conclua uma doação antes de continuar.';
  end if;

  begin
    insert into public.need_interests (request_item_id, donor_id)
    values (p_need_id, auth.uid())
    returning id into v_id;
  exception when unique_violation then
    raise exception 'BUSINESS_RULE: Você já demonstrou interesse nesta necessidade.';
  end;

  perform public.notify(
    v_student,
    'Alguém quer ajudar',
    'Um doador demonstrou interesse em atender uma das suas necessidades. Acompanhe o pedido pelo aplicativo.',
    'info'
  );
  perform public.audit('express_interest', 'need_interests', v_id::text);
end $$;

create or replace function public.list_my_interests()
returns table (
  interest_id uuid,
  need_id uuid,
  category text,
  size text,
  quantity integer,
  district text,
  status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.current_role_is('donor') then
    raise exception 'NOT_ALLOWED';
  end if;
  return query
    select ni.id, ri.id, ri.category, ri.size, ri.quantity_requested, cp.district, r.status, ni.created_at
      from public.need_interests ni
      join public.request_items ri on ri.id = ni.request_item_id
      join public.requests r on r.id = ri.request_id
      join public.collection_points cp on cp.id = r.point_id
     where ni.donor_id = auth.uid()
     order by ni.created_at desc;
end $$;

revoke execute on function public.list_open_needs() from public, anon;
revoke execute on function public.express_interest(uuid) from public, anon;
revoke execute on function public.list_my_interests() from public, anon;
grant execute on function public.list_open_needs() to authenticated;
grant execute on function public.express_interest(uuid) to authenticated;
grant execute on function public.list_my_interests() to authenticated;

commit;
