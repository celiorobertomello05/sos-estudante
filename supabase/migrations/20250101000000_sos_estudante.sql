-- =====================================================================
-- SOS Estudante — esquema principal
-- Princípios:
--   * RLS em todas as tabelas; nada é acessível para "anon".
--   * O app só escreve diretamente em poucas colunas (perfil, configurações,
--     leitura de notificações). Todo o resto passa por funções RPC
--     (security definer) que validam papel e regras de negócio.
--   * Coletores nunca leem CPF, documentos ou o código de retirada.
--   * Arquivos ficam em buckets privados, separados por pasta.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ───────────── Tabelas ─────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text check (role in ('student', 'donor', 'collector')),
  status text not null default 'active' check (status in ('active', 'pending', 'blocked')),
  full_name text not null default '' check (char_length(full_name) <= 120),
  email text not null default '',
  phone text check (phone ~ '^\d{10,11}$'),
  document text check (document ~ '^\d{11}$|^\d{14}$'),
  birth_date date,
  donor_kind text check (donor_kind in ('individual', 'company')),
  postal_code text check (postal_code ~ '^\d{8}$'),
  address text check (char_length(address) <= 200),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_name text not null check (char_length(school_name) between 3 and 120),
  enrollment_number text not null check (char_length(enrollment_number) between 3 and 40),
  grade text not null check (char_length(grade) between 1 and 40),
  valid_until text not null check (char_length(valid_until) <= 20),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  document_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index enrollments_one_active on public.enrollments (student_id) where is_active;

create table public.collection_points (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  district text not null,
  distance_km numeric(5, 1) not null default 0,
  hours text not null,
  open_now boolean not null default true,
  rating numeric(2, 1) not null default 5 check (rating between 0 and 5),
  capacity int not null default 100 check (capacity between 0 and 100),
  latitude double precision not null,
  longitude double precision not null,
  image_key text not null default 'pointA',
  is_active boolean not null default true
);

create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('camisa', 'calca', 'agasalho', 'kit', 'shorts', 'jaqueta')),
  sizes text[] not null default '{}',
  quantity int not null default 0 check (quantity >= 0),
  condition text not null check (condition in ('novo', 'muito_bom', 'bom')),
  location text not null,
  school text not null default 'Todas',
  donor_name text not null default '',
  received_at timestamptz not null default now()
);
create index stock_items_category on public.stock_items (category);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  protocol text not null unique,
  donor_id uuid not null references public.profiles (id) on delete cascade,
  donor_name text not null,
  category text not null check (category in ('camisa', 'calca', 'agasalho', 'kit', 'shorts', 'jaqueta')),
  size text not null check (char_length(size) <= 10),
  quantity int not null check (quantity between 1 and 50),
  condition text not null check (condition in ('novo', 'muito_bom', 'bom')),
  point_id uuid not null references public.collection_points (id),
  scheduled_for timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'received', 'approved', 'rejected', 'stocked')),
  review_note text check (char_length(review_note) <= 300),
  reviewed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index donations_donor on public.donations (donor_id);
create index donations_status on public.donations (status);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  protocol text not null unique,
  student_id uuid not null references public.profiles (id) on delete cascade,
  student_name text not null,
  school_name text not null,
  contact_masked text not null,
  status text not null default 'in_review' check (status in ('in_review', 'approved', 'separating', 'ready', 'delivered', 'cancelled')),
  point_id uuid not null references public.collection_points (id),
  pickup_at timestamptz not null,
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index requests_student on public.requests (student_id);
create index requests_status on public.requests (status);

create table public.request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  category text not null check (category in ('camisa', 'calca', 'agasalho', 'kit', 'shorts', 'jaqueta')),
  size text not null check (char_length(size) <= 10),
  quantity_requested int not null check (quantity_requested between 1 and 5),
  quantity_approved int not null default 0 check (quantity_approved between 0 and 5),
  unique (request_id, category, size)
);

create table public.request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);
create index request_events_request on public.request_events (request_id);

-- Código de retirada: visível só para o próprio aluno.
create table public.pickup_codes (
  request_id uuid primary key references public.requests (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  code text not null check (code ~ '^\d{4}$'),
  failed_attempts int not null default 0,
  created_at timestamptz not null default now()
);

create table public.deliveries (
  request_id uuid primary key references public.requests (id) on delete cascade,
  receipt_number text not null unique,
  photo_path text not null,
  signature_path text not null,
  delivered_at timestamptz not null default now(),
  collector_id uuid not null references public.profiles (id),
  collector_name text not null
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  stock_item_id uuid references public.stock_items (id) on delete set null,
  label text not null,
  type text not null check (type in ('in', 'out', 'transfer', 'adjust')),
  quantity int not null check (quantity between 0 and 1000),
  from_location text not null,
  to_location text not null,
  responsible_id uuid references public.profiles (id),
  responsible_name text not null,
  created_at timestamptz not null default now()
);
create index stock_movements_created on public.stock_movements (created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'info' check (kind in ('success', 'info', 'reminder')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user on public.notifications (user_id, created_at desc);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  protocol text not null unique,
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (char_length(subject) between 3 and 80),
  message text not null check (char_length(message) between 10 and 1000),
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  push_enabled boolean not null default true,
  email_enabled boolean not null default true,
  pickup_reminders boolean not null default true,
  campaign_updates boolean not null default false,
  share_location boolean not null default true,
  large_text boolean not null default false,
  reduce_motion boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Auditoria: só o painel do Supabase (service role) lê.
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ───────────── Auxiliares ─────────────
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger requests_touch before update on public.requests for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.user_settings for each row execute function public.touch_updated_at();

create function public.is_collector() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'collector' and status = 'active'
  );
$$;

create function public.current_role_is(p_role text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = p_role and status = 'active'
  );
$$;

create function public.new_protocol(p_prefix text) returns text
language sql volatile set search_path = '' as $$
  select p_prefix || '-' || to_char(now(), 'YYYY') || '-' ||
         upper(encode(extensions.gen_random_bytes(3), 'hex'));
$$;

create function public.random_pickup_code() returns text
language sql volatile set search_path = '' as $$
  select lpad(((get_byte(b, 0) * 256 + get_byte(b, 1)) % 9000 + 1000)::text, 4, '0')
  from (select extensions.gen_random_bytes(2) as b) r;
$$;

create function public.audit(p_action text, p_entity text, p_entity_id text, p_details jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), p_action, p_entity, p_entity_id, p_details);
$$;

create function public.notify(p_user uuid, p_title text, p_body text, p_kind text default 'info')
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, title, body, kind) values (p_user, p_title, p_body, p_kind);
$$;

-- Perfil criado automaticamente no cadastro. Só aceita papéis válidos;
-- coletores começam "pendentes" até aprovação da instituição.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_role text := new.raw_user_meta_data ->> 'role';
begin
  if v_role not in ('student', 'donor', 'collector') then
    v_role := null;
  end if;
  insert into public.profiles (id, role, status, full_name, email, phone, document, birth_date, donor_kind, postal_code, address)
  values (
    new.id,
    v_role,
    case when v_role = 'collector' then 'pending' else 'active' end,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 120),
    coalesce(new.email, ''),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g'), ''),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'document', ''), '\D', '', 'g'), ''),
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    case when new.raw_user_meta_data ->> 'donor_kind' in ('individual', 'company') then new.raw_user_meta_data ->> 'donor_kind' end,
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'postal_code', ''), '\D', '', 'g'), ''),
    nullif(left(new.raw_user_meta_data ->> 'address', 200), '')
  );
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ───────────── RLS ─────────────
alter table public.profiles enable row level security;
alter table public.enrollments enable row level security;
alter table public.collection_points enable row level security;
alter table public.stock_items enable row level security;
alter table public.donations enable row level security;
alter table public.requests enable row level security;
alter table public.request_items enable row level security;
alter table public.request_events enable row level security;
alter table public.pickup_codes enable row level security;
alter table public.deliveries enable row level security;
alter table public.stock_movements enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.user_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy "perfil próprio" on public.profiles for select to authenticated using (id = auth.uid());
create policy "editar perfil próprio" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "matrícula própria" on public.enrollments for select to authenticated using (student_id = auth.uid());

create policy "pontos ativos" on public.collection_points for select to authenticated using (is_active);
create policy "estoque visível" on public.stock_items for select to authenticated using (true);

create policy "doações próprias ou equipe" on public.donations for select to authenticated
  using (donor_id = auth.uid() or public.is_collector());

create policy "pedidos próprios ou equipe" on public.requests for select to authenticated
  using (student_id = auth.uid() or public.is_collector());
create policy "itens visíveis com o pedido" on public.request_items for select to authenticated
  using (exists (select 1 from public.requests r where r.id = request_id and (r.student_id = auth.uid() or public.is_collector())));
create policy "eventos visíveis com o pedido" on public.request_events for select to authenticated
  using (exists (select 1 from public.requests r where r.id = request_id and (r.student_id = auth.uid() or public.is_collector())));

create policy "código só do aluno" on public.pickup_codes for select to authenticated using (student_id = auth.uid());

create policy "entregas da equipe ou do aluno" on public.deliveries for select to authenticated
  using (public.is_collector() or exists (select 1 from public.requests r where r.id = request_id and r.student_id = auth.uid()));

create policy "movimentos da equipe" on public.stock_movements for select to authenticated using (public.is_collector());

create policy "notificações próprias" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "marcar notificações próprias" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "atendimentos próprios" on public.support_tickets for select to authenticated using (user_id = auth.uid());

create policy "configurações próprias" on public.user_settings for select to authenticated using (user_id = auth.uid());
create policy "criar configurações próprias" on public.user_settings for insert to authenticated with check (user_id = auth.uid());
create policy "editar configurações próprias" on public.user_settings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────────── Privilégios (menor privilégio) ─────────────
revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate on all tables in schema public from authenticated;
-- Perfil: só dados pessoais editáveis. Papel, status, CPF e e-mail ficam bloqueados.
grant update (full_name, phone, postal_code, address, avatar_path) on public.profiles to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant insert, update on public.user_settings to authenticated;
revoke all on public.audit_logs from authenticated;

-- ───────────── Funções RPC ─────────────

-- Conta criada com Google: escolhe o papel uma única vez.
create function public.claim_initial_role(p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_role not in ('student', 'donor', 'collector') then
    raise exception 'BUSINESS_RULE: Perfil inválido.';
  end if;
  update public.profiles
     set role = p_role, status = case when p_role = 'collector' then 'pending' else 'active' end
   where id = auth.uid() and role is null;
  if not found then
    raise exception 'NOT_ALLOWED';
  end if;
  perform public.audit('claim_role', 'profiles', auth.uid()::text, jsonb_build_object('role', p_role));
end $$;

create function public.submit_enrollment(
  p_school_name text, p_enrollment_number text, p_grade text, p_valid_until text, p_document_path text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'student' and status = 'active') then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_document_path is not null and split_part(p_document_path, '/', 1) <> auth.uid()::text then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_document_path is null and not exists (
    select 1 from public.enrollments where student_id = auth.uid() and document_path is not null
  ) then
    raise exception 'BUSINESS_RULE: Anexe a declaração de matrícula.';
  end if;
  update public.enrollments set is_active = false where student_id = auth.uid() and is_active;
  insert into public.enrollments (student_id, school_name, enrollment_number, grade, valid_until, document_path)
  values (
    auth.uid(), trim(p_school_name), trim(p_enrollment_number), trim(p_grade), trim(p_valid_until),
    coalesce(p_document_path, (select document_path from public.enrollments
                               where student_id = auth.uid() and document_path is not null
                               order by created_at desc limit 1))
  );
  perform public.audit('submit_enrollment', 'enrollments', auth.uid()::text);
end $$;

create function public.create_donation(
  p_category text, p_size text, p_quantity int, p_condition text, p_point_id uuid, p_scheduled_for timestamptz
) returns public.donations
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
  v_row public.donations;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.role is distinct from 'donor' or v_profile.status <> 'active' then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_quantity not between 1 and 50 then
    raise exception 'BUSINESS_RULE: Informe entre 1 e 50 unidades.';
  end if;
  if p_scheduled_for < now() or p_scheduled_for > now() + interval '60 days' then
    raise exception 'BUSINESS_RULE: Escolha uma data nos próximos 60 dias.';
  end if;
  if not exists (select 1 from public.collection_points where id = p_point_id and is_active) then
    raise exception 'BUSINESS_RULE: Ponto de coleta indisponível.';
  end if;
  if (select count(*) from public.donations where donor_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'BUSINESS_RULE: Limite diário de doações atingido.';
  end if;

  insert into public.donations (protocol, donor_id, donor_name, category, size, quantity, condition, point_id, scheduled_for)
  values (public.new_protocol('DOA'), auth.uid(), v_profile.full_name, p_category, left(trim(p_size), 10), p_quantity, p_condition, p_point_id, p_scheduled_for)
  returning * into v_row;

  perform public.notify(auth.uid(), 'Doação agendada', 'Leve os itens ao ponto parceiro. Protocolo ' || v_row.protocol || '.', 'success');
  perform public.audit('create_donation', 'donations', v_row.id::text);
  return v_row;
end $$;

-- Triagem: aprovar, recusar (com motivo) ou enviar ao estoque.
create function public.review_donation(p_donation_id uuid, p_decision text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_don public.donations;
  v_stock_id uuid;
  v_actor text;
begin
  if not public.is_collector() then
    raise exception 'NOT_ALLOWED';
  end if;
  select * into v_don from public.donations where id = p_donation_id for update;
  if not found then
    raise exception 'BUSINESS_RULE: Doação não encontrada.';
  end if;
  if p_decision not in ('approve', 'reject', 'stock')
     or (v_don.status in ('rejected', 'stocked'))
     or (v_don.status = 'approved' and p_decision <> 'stock') then
    raise exception 'BUSINESS_RULE: Esta mudança de etapa não é permitida.';
  end if;
  if p_decision = 'reject' and char_length(coalesce(trim(p_note), '')) < 5 then
    raise exception 'BUSINESS_RULE: Informe o motivo da recusa.';
  end if;

  update public.donations
     set status = case p_decision when 'approve' then 'approved' when 'reject' then 'rejected' else 'stocked' end,
         review_note = coalesce(left(trim(p_note), 300), review_note),
         reviewed_by = auth.uid()
   where id = p_donation_id;

  if p_decision = 'stock' then
    select full_name into v_actor from public.profiles where id = auth.uid();
    select id into v_stock_id from public.stock_items where category = v_don.category order by quantity desc limit 1 for update;
    if v_stock_id is null then
      insert into public.stock_items (category, sizes, quantity, condition, location, donor_name)
      values (v_don.category, array[v_don.size], v_don.quantity, v_don.condition, 'Estoque A',
              split_part(v_don.donor_name, ' ', 1) || ' ' || left(split_part(v_don.donor_name, ' ', 2), 1) || '.')
      returning id into v_stock_id;
    else
      update public.stock_items
         set quantity = quantity + v_don.quantity,
             sizes = case when v_don.size = any (sizes) then sizes else sizes || v_don.size end,
             received_at = now()
       where id = v_stock_id;
    end if;
    insert into public.stock_movements (stock_item_id, label, type, quantity, from_location, to_location, responsible_id, responsible_name)
    values (v_stock_id, v_don.category || ' Tam. ' || v_don.size, 'in', v_don.quantity, 'Triagem', 'Estoque A', auth.uid(), v_actor);
    perform public.notify(v_don.donor_id, 'Sua doação já está no estoque', 'Protocolo ' || v_don.protocol || ': obrigado por ajudar estudantes!', 'success');
  elsif p_decision = 'reject' then
    perform public.notify(v_don.donor_id, 'Doação não aprovada', 'Protocolo ' || v_don.protocol || ': ' || trim(p_note), 'info');
  end if;
  perform public.audit('review_donation', 'donations', p_donation_id::text, jsonb_build_object('decision', p_decision));
end $$;

-- Solicitação do aluno com todas as regras de elegibilidade e estoque.
create function public.create_request(p_items jsonb, p_point_id uuid, p_notes text) returns public.requests
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
  v_enrollment public.enrollments;
  v_row public.requests;
  v_item jsonb;
  v_qty int;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.role is distinct from 'student' or v_profile.status <> 'active' then
    raise exception 'NOT_ALLOWED';
  end if;
  select * into v_enrollment from public.enrollments where student_id = auth.uid() and is_active and status = 'verified';
  if not found then
    raise exception 'BUSINESS_RULE: Envie e valide sua declaração de matrícula antes de solicitar.';
  end if;
  if (select count(*) from public.requests where student_id = auth.uid() and status not in ('delivered', 'cancelled')) >= 3 then
    raise exception 'BUSINESS_RULE: Você pode ter até 3 solicitações em andamento.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 5 then
    raise exception 'BUSINESS_RULE: Cada solicitação aceita de 1 a 5 itens.';
  end if;
  if not exists (select 1 from public.collection_points where id = p_point_id and is_active) then
    raise exception 'BUSINESS_RULE: Ponto de retirada indisponível.';
  end if;

  insert into public.requests (protocol, student_id, student_name, school_name, contact_masked, point_id, pickup_at, notes)
  values (
    public.new_protocol('SOL'), auth.uid(), v_profile.full_name, v_enrollment.school_name,
    case when v_profile.phone is null then 'Protegido' else '(**) *****-**' || right(v_profile.phone, 2) end,
    p_point_id, now() + interval '3 days', nullif(left(trim(p_notes), 300), '')
  ) returning * into v_row;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty not between 1 and 5 then
      raise exception 'BUSINESS_RULE: A quantidade por item deve ficar entre 1 e 5.';
    end if;
    if coalesce((select sum(quantity) from public.stock_items where category = v_item ->> 'category'), 0) < v_qty then
      raise exception 'BUSINESS_RULE: Estoque insuficiente para um dos itens.';
    end if;
    insert into public.request_items (request_id, category, size, quantity_requested)
    values (v_row.id, v_item ->> 'category', left(v_item ->> 'size', 10), v_qty);
  end loop;

  insert into public.request_events (request_id, label) values (v_row.id, 'Solicitação enviada');
  insert into public.pickup_codes (request_id, student_id, code) values (v_row.id, auth.uid(), public.random_pickup_code());
  perform public.notify(auth.uid(), 'Solicitação enviada', 'Protocolo ' || v_row.protocol || ' em análise.', 'success');
  perform public.audit('create_request', 'requests', v_row.id::text);
  return v_row;
exception
  when unique_violation then
    raise exception 'BUSINESS_RULE: Há itens repetidos na solicitação.';
end $$;

-- Equipe avança o pedido: análise → aprovado → separando → pronto.
create function public.advance_request(p_request_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.requests;
begin
  if not public.is_collector() then
    raise exception 'NOT_ALLOWED';
  end if;
  select * into v_req from public.requests where id = p_request_id for update;
  if not found or not (
       (v_req.status = 'in_review' and p_status in ('approved', 'cancelled'))
    or (v_req.status = 'approved' and p_status in ('separating', 'cancelled'))
    or (v_req.status = 'separating' and p_status in ('ready', 'cancelled'))
  ) then
    raise exception 'BUSINESS_RULE: Esta mudança de etapa não é permitida.';
  end if;

  update public.requests set status = p_status where id = p_request_id;

  if p_status = 'approved' then
    update public.request_items ri
       set quantity_approved = least(ri.quantity_requested,
             coalesce((select sum(quantity) from public.stock_items s where s.category = ri.category), 0))
     where ri.request_id = p_request_id;
    insert into public.request_events (request_id, label) values (p_request_id, 'Solicitação analisada');
    perform public.notify(v_req.student_id, 'Pedido aprovado!', 'Sua solicitação ' || v_req.protocol || ' foi aprovada e está em preparação.', 'success');
  elsif p_status = 'separating' then
    insert into public.request_events (request_id, label) values (p_request_id, 'Itens separados');
  elsif p_status = 'ready' then
    insert into public.request_events (request_id, label) values (p_request_id, 'Kit preparado'), (p_request_id, 'Pronto para retirada');
    perform public.notify(v_req.student_id, 'Kit pronto para retirada', 'Leve seu código de retirada ao ponto escolhido.', 'info');
  else
    delete from public.pickup_codes where request_id = p_request_id;
    perform public.notify(v_req.student_id, 'Solicitação cancelada', 'O pedido ' || v_req.protocol || ' foi cancelado pela equipe.', 'info');
  end if;
  perform public.audit('advance_request', 'requests', p_request_id::text, jsonb_build_object('status', p_status));
end $$;

create function public.cancel_request(p_request_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.requests set status = 'cancelled'
   where id = p_request_id and student_id = auth.uid() and status in ('in_review', 'approved', 'separating');
  if not found then
    raise exception 'BUSINESS_RULE: Esta solicitação não pode mais ser cancelada.';
  end if;
  delete from public.pickup_codes where request_id = p_request_id;
  perform public.audit('cancel_request', 'requests', p_request_id::text);
end $$;

-- Entrega: valida o código (com bloqueio após 5 erros), registra comprovantes
-- e dá baixa no estoque. Retorna 'ok', 'invalid' ou 'locked'.
create function public.confirm_delivery(p_request_id uuid, p_code text, p_photo_path text, p_signature_path text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.requests;
  v_code public.pickup_codes;
  v_actor text;
  v_item public.request_items;
  v_left int;
  v_stock record;
begin
  if not public.is_collector() then
    raise exception 'NOT_ALLOWED';
  end if;
  select * into v_req from public.requests where id = p_request_id for update;
  if not found or v_req.status <> 'ready' then
    raise exception 'BUSINESS_RULE: O pedido ainda não está pronto para entrega.';
  end if;
  if split_part(p_photo_path, '/', 1) <> p_request_id::text or split_part(p_signature_path, '/', 1) <> p_request_id::text then
    raise exception 'NOT_ALLOWED';
  end if;
  select * into v_code from public.pickup_codes where request_id = p_request_id for update;
  if not found or v_code.failed_attempts >= 5 then
    return 'locked';
  end if;
  if v_code.code <> p_code then
    update public.pickup_codes set failed_attempts = failed_attempts + 1 where request_id = p_request_id;
    perform public.audit('pickup_code_invalid', 'requests', p_request_id::text);
    return 'invalid';
  end if;

  select full_name into v_actor from public.profiles where id = auth.uid();
  for v_item in select * from public.request_items where request_id = p_request_id and quantity_approved > 0 loop
    v_left := v_item.quantity_approved;
    for v_stock in select id, quantity from public.stock_items where category = v_item.category and quantity > 0 order by quantity desc for update loop
      exit when v_left = 0;
      update public.stock_items set quantity = quantity - least(v_left, v_stock.quantity) where id = v_stock.id;
      insert into public.stock_movements (stock_item_id, label, type, quantity, from_location, to_location, responsible_id, responsible_name)
      values (v_stock.id, v_item.category || ' Tam. ' || v_item.size, 'out', least(v_left, v_stock.quantity), 'Estoque', 'Entrega ' || v_req.protocol, auth.uid(), v_actor);
      v_left := v_left - least(v_left, v_stock.quantity);
    end loop;
    if v_left > 0 then
      raise exception 'BUSINESS_RULE: Estoque insuficiente para concluir a entrega.';
    end if;
  end loop;

  insert into public.deliveries (request_id, receipt_number, photo_path, signature_path, collector_id, collector_name)
  values (p_request_id, public.new_protocol('ENT'), p_photo_path, p_signature_path, auth.uid(), v_actor);
  update public.requests set status = 'delivered' where id = p_request_id;
  insert into public.request_events (request_id, label) values (p_request_id, 'Retirada realizada');
  delete from public.pickup_codes where request_id = p_request_id;
  perform public.notify(v_req.student_id, 'Retirada confirmada', 'Bons estudos! O comprovante do pedido ' || v_req.protocol || ' está disponível.', 'success');
  perform public.audit('confirm_delivery', 'requests', p_request_id::text);
  return 'ok';
end $$;

create function public.register_stock_movement(
  p_stock_item_id uuid, p_label text, p_type text, p_quantity int, p_from text, p_to text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor text;
  v_current int;
begin
  if not public.is_collector() then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_type not in ('in', 'out', 'transfer', 'adjust')
     or p_quantity > 1000 or p_quantity < (case when p_type = 'adjust' then 0 else 1 end) then
    raise exception 'BUSINESS_RULE: Movimentação inválida.';
  end if;
  select quantity into v_current from public.stock_items where id = p_stock_item_id for update;
  if not found then
    raise exception 'BUSINESS_RULE: Item de estoque não encontrado.';
  end if;
  if p_type = 'out' and v_current < p_quantity then
    raise exception 'BUSINESS_RULE: Estoque insuficiente para esta saída.';
  end if;
  update public.stock_items
     set quantity = case p_type when 'in' then quantity + p_quantity when 'out' then quantity - p_quantity
                                when 'adjust' then p_quantity else quantity end,
         location = case when p_type = 'transfer' then left(trim(p_to), 60) else location end
   where id = p_stock_item_id;
  select full_name into v_actor from public.profiles where id = auth.uid();
  insert into public.stock_movements (stock_item_id, label, type, quantity, from_location, to_location, responsible_id, responsible_name)
  values (p_stock_item_id, left(trim(p_label), 80), p_type, p_quantity, left(trim(p_from), 60), left(trim(p_to), 60), auth.uid(), v_actor);
  perform public.audit('stock_movement', 'stock_items', p_stock_item_id::text,
    jsonb_build_object('type', p_type, 'quantity', p_quantity, 'before', v_current));
end $$;

create function public.open_support_ticket(p_subject text, p_message text) returns public.support_tickets
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.support_tickets;
begin
  if auth.uid() is null then
    raise exception 'NOT_ALLOWED';
  end if;
  if (select count(*) from public.support_tickets where user_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'BUSINESS_RULE: Limite diário de atendimentos atingido. Tente amanhã.';
  end if;
  insert into public.support_tickets (protocol, user_id, subject, message)
  values (public.new_protocol('SUP'), auth.uid(), trim(p_subject), trim(p_message))
  returning * into v_row;
  return v_row;
end $$;

-- Funções internas não podem ser chamadas pelo app.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.claim_initial_role(text),
  public.submit_enrollment(text, text, text, text, text),
  public.create_donation(text, text, int, text, uuid, timestamptz),
  public.review_donation(uuid, text, text),
  public.create_request(jsonb, uuid, text),
  public.advance_request(uuid, text),
  public.cancel_request(uuid),
  public.confirm_delivery(uuid, text, text, text),
  public.register_stock_movement(uuid, text, text, int, text, text),
  public.open_support_ticket(text, text)
to authenticated;
-- Usadas dentro das políticas RLS.
grant execute on function public.is_collector(), public.current_role_is(text) to authenticated;

-- ───────────── Storage (buckets privados) ─────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', false, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 8388608, array['image/jpeg', 'image/png', 'application/pdf']),
  ('delivery-proofs', 'delivery-proofs', false, 8388608, array['image/jpeg', 'image/png', 'image/svg+xml'])
on conflict (id) do update set public = false;

-- Avatares e documentos: cada usuário só mexe na própria pasta (<uid>/arquivo).
create policy "avatar próprio" on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "documentos próprios" on storage.objects for all to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Comprovantes: equipe grava em pedidos prontos; aluno pode ver os seus.
create policy "comprovantes equipe grava" on storage.objects for insert to authenticated
  with check (bucket_id = 'delivery-proofs' and public.is_collector() and exists (
    select 1 from public.requests r where r.id::text = (storage.foldername(name))[1] and r.status = 'ready'));
create policy "comprovantes equipe atualiza" on storage.objects for update to authenticated
  using (bucket_id = 'delivery-proofs' and public.is_collector() and exists (
    select 1 from public.requests r where r.id::text = (storage.foldername(name))[1] and r.status = 'ready'));
create policy "comprovantes leitura" on storage.objects for select to authenticated
  using (bucket_id = 'delivery-proofs' and (public.is_collector() or exists (
    select 1 from public.requests r where r.id::text = (storage.foldername(name))[1] and r.student_id = auth.uid())));
