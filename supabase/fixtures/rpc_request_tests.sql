-- =====================================================================
-- SOS Estudante — fixtures isolados para testar create_request e RLS
-- =====================================================================
-- NÃO EXECUTAR EM PRODUÇÃO.
-- Este arquivo não cria usuários Auth, não contém credenciais e não chama
-- confirm_delivery. Crie manualmente usuários Auth exclusivos no projeto de
-- desenvolvimento e substitua TODOS os UUIDs 00000000-... abaixo pelos UUIDs
-- reais gerados pelo Auth antes de executar este arquivo.
--
-- Todos os UUIDs persistentes controlados por este arquivo começam com
-- 52504354 ("RPCT" em hexadecimal). Nomes e protocolos usam "RPC-TEST".
-- O script falha antes de alterar dados se algum usuário/perfil não existir
-- ou se algum aluno de teste já tiver matrícula ativa ou pedido.
--
-- Dependências:
--   auth.users (manual) -> profiles -> enrollments
--   collection_points -> requests -> request_items/request_events/deliveries
--   stock_items é independente; nenhum movimento de estoque é criado.
-- =====================================================================

begin;

-- ──────────────────────────────────────────────────────────────────────
-- 0. Registro dos UUIDs Auth manuais (PLACEHOLDERS OBRIGATÓRIOS)
-- ──────────────────────────────────────────────────────────────────────
-- Substitua cada UUID nas duas áreas deste arquivo:
--   a) registro abaixo;
--   b) bloco comentado de limpeza no final.
create temporary table rpc_test_auth_ids (
  fixture_key text primary key,
  user_id uuid not null unique
) on commit preserve rows;

insert into rpc_test_auth_ids (fixture_key, user_id) values
  ('student_no_enrollment', '00000000-0000-4000-8000-000000000101'),
  ('student_verified',      '00000000-0000-4000-8000-000000000102'),
  ('student_recent',        '00000000-0000-4000-8000-000000000103'),
  ('student_deadline',      '00000000-0000-4000-8000-000000000104'),
  ('student_open',          '00000000-0000-4000-8000-000000000105'),
  ('student_mixed',         '00000000-0000-4000-8000-000000000106'),
  ('student_cancelled',     '00000000-0000-4000-8000-000000000107'),
  ('student_owner_a',       '00000000-0000-4000-8000-000000000108'),
  ('student_owner_b',       '00000000-0000-4000-8000-000000000109'),
  ('student_blocked',       '00000000-0000-4000-8000-000000000110'),
  ('student_concurrent',    '00000000-0000-4000-8000-000000000111'),
  ('collector',             '00000000-0000-4000-8000-000000000199');

do $preflight$
begin
  if exists (
    select 1
      from rpc_test_auth_ids fixture
      left join auth.users auth_user on auth_user.id = fixture.user_id
     where auth_user.id is null
  ) then
    raise exception 'RPC-TEST: substitua os placeholders por UUIDs Auth existentes.';
  end if;

  if exists (
    select 1
      from rpc_test_auth_ids fixture
      left join public.profiles profile on profile.id = fixture.user_id
     where profile.id is null
  ) then
    raise exception 'RPC-TEST: um usuário Auth ainda não possui profile.';
  end if;

  if exists (
    select 1
      from public.enrollments enrollment
     where enrollment.student_id in (
       select user_id
         from rpc_test_auth_ids
        where fixture_key like 'student_%'
     )
       and enrollment.is_active
  ) then
    raise exception 'RPC-TEST: use alunos sem matrícula ativa anterior.';
  end if;

  if exists (
    select 1
      from public.requests request
     where request.student_id in (
       select user_id
         from rpc_test_auth_ids
        where fixture_key like 'student_%'
     )
  ) then
    raise exception 'RPC-TEST: use alunos sem pedidos anteriores.';
  end if;
end
$preflight$;

-- Um único instante é reutilizado pelos fixtures temporais.
create temporary table rpc_test_clock (
  fixture_now timestamptz not null,
  exact_deadline_delivery timestamptz not null
) on commit preserve rows;

insert into rpc_test_clock (fixture_now, exact_deadline_delivery)
select
  now(),
  ((now() at time zone 'UTC') - interval '6 months') at time zone 'UTC';

-- Em alguns últimos dias do mês não existe inverso exato seis meses antes.
-- Nessa situação, interrompa e execute o cenário de igualdade em uma data
-- controlada; não aceite silenciosamente um teste "após o vencimento".
do $deadline_preflight$
declare
  v_fixture_now timestamptz;
  v_delivery timestamptz;
  v_eligible_at timestamptz;
begin
  select fixture_now, exact_deadline_delivery
    into v_fixture_now, v_delivery
    from rpc_test_clock;

  v_eligible_at :=
    ((v_delivery at time zone 'UTC') + interval '6 months') at time zone 'UTC';

  if v_eligible_at <> v_fixture_now then
    raise exception 'RPC-TEST: a data atual não permite fixture de vencimento exatamente reversível.';
  end if;
end
$deadline_preflight$;

-- ──────────────────────────────────────────────────────────────────────
-- 1. Fixtures de perfil
-- ──────────────────────────────────────────────────────────────────────
-- Os profiles são criados pelo trigger do Auth. Aqui somente os usuários
-- dedicados são configurados por UUID exato.
update public.profiles profile
   set role = fixture.role,
       status = fixture.status,
       full_name = fixture.full_name
  from (
    values
      ((select user_id from rpc_test_auth_ids where fixture_key = 'student_no_enrollment'), 'student', 'active',  '[RPC-TEST] Sem matrícula'),
      ((select user_id from rpc_test_auth_ids where fixture_key = 'student_verified'),      'student', 'active',  '[RPC-TEST] Primeira solicitação'),
      ((select user_id from rpc_test_auth_ids where fixture_key = 'student_recent'),        'student', 'active',  '[RPC-TEST] Entrega recente'),
      ((select user_id from rpc_test_auth_ids where fixture_key = 'student_deadline'),      'student', 'active',  '[RPC-TEST] Vencimento exato'),
      ((select user_id from rpc_test_auth_ids where fixture_key = 'student_open'),          'student', 'active',  '[RPC-TEST] Pedido aberto'),
      ((select user_id from rpc_test_auth_ids where fixture_key = 'student_mixed'),         'student', 'active',  '[RPC-TEST] Pedido misto'),
      ((select user_id from rpc_test_auth_ids where fixture_key = 'student_cancelled'),     'student', 'active',  '[RPC-TEST] Pedido cancelado'),
      ((select user_id from rpc_test_auth_ids where fixture_key = 'student_owner_a'),       'student', 'active',  '[RPC-TEST] Proprietário A'),
      ((select user_id from rpc_test_auth_ids where fixture_key = 'student_owner_b'),       'student', 'active',  '[RPC-TEST] Proprietário B'),
      ((select user_id from rpc_test_auth_ids where fixture_key = 'student_blocked'),       'student', 'blocked', '[RPC-TEST] Perfil bloqueado'),
      ((select user_id from rpc_test_auth_ids where fixture_key = 'student_concurrent'),    'student', 'active',  '[RPC-TEST] Concorrência'),
      ((select user_id from rpc_test_auth_ids where fixture_key = 'collector'),             'collector', 'active', '[RPC-TEST] Coletor')
  ) as fixture(id, role, status, full_name)
 where profile.id = fixture.id;

-- ──────────────────────────────────────────────────────────────────────
-- 2. Fixtures de matrícula
-- ──────────────────────────────────────────────────────────────────────
-- student_no_enrollment fica intencionalmente sem matrícula.
insert into public.enrollments (
  id,
  student_id,
  school_name,
  enrollment_number,
  grade,
  valid_until,
  status,
  document_path,
  is_active
) values
  ('52504354-3000-4000-8000-000000000001', (select user_id from rpc_test_auth_ids where fixture_key = 'student_verified'),  '[RPC-TEST] Escola', 'RPC-TEST-001', '8º ano', 'dez 2099', 'verified', null, true),
  ('52504354-3000-4000-8000-000000000002', (select user_id from rpc_test_auth_ids where fixture_key = 'student_recent'),    '[RPC-TEST] Escola', 'RPC-TEST-002', '8º ano', 'dez 2099', 'verified', null, true),
  ('52504354-3000-4000-8000-000000000003', (select user_id from rpc_test_auth_ids where fixture_key = 'student_deadline'),  '[RPC-TEST] Escola', 'RPC-TEST-003', '8º ano', 'dez 2099', 'verified', null, true),
  ('52504354-3000-4000-8000-000000000004', (select user_id from rpc_test_auth_ids where fixture_key = 'student_open'),      '[RPC-TEST] Escola', 'RPC-TEST-004', '8º ano', 'dez 2099', 'verified', null, true),
  ('52504354-3000-4000-8000-000000000005', (select user_id from rpc_test_auth_ids where fixture_key = 'student_mixed'),     '[RPC-TEST] Escola', 'RPC-TEST-005', '8º ano', 'dez 2099', 'verified', null, true),
  ('52504354-3000-4000-8000-000000000006', (select user_id from rpc_test_auth_ids where fixture_key = 'student_cancelled'), '[RPC-TEST] Escola', 'RPC-TEST-006', '8º ano', 'dez 2099', 'verified', null, true),
  ('52504354-3000-4000-8000-000000000007', (select user_id from rpc_test_auth_ids where fixture_key = 'student_owner_a'),   '[RPC-TEST] Escola', 'RPC-TEST-007', '8º ano', 'dez 2099', 'verified', null, true),
  ('52504354-3000-4000-8000-000000000008', (select user_id from rpc_test_auth_ids where fixture_key = 'student_owner_b'),   '[RPC-TEST] Escola', 'RPC-TEST-008', '8º ano', 'dez 2099', 'verified', null, true),
  ('52504354-3000-4000-8000-000000000009', (select user_id from rpc_test_auth_ids where fixture_key = 'student_blocked'),   '[RPC-TEST] Escola', 'RPC-TEST-009', '8º ano', 'dez 2099', 'verified', null, true),
  ('52504354-3000-4000-8000-000000000010', (select user_id from rpc_test_auth_ids where fixture_key = 'student_concurrent'),'[RPC-TEST] Escola', 'RPC-TEST-010', '8º ano', 'dez 2099', 'verified', null, true);

-- ──────────────────────────────────────────────────────────────────────
-- 3. Ponto de coleta de teste
-- ──────────────────────────────────────────────────────────────────────
insert into public.collection_points (
  id,
  name,
  address,
  district,
  distance_km,
  hours,
  open_now,
  rating,
  capacity,
  latitude,
  longitude,
  image_key,
  is_active
) values (
  '52504354-1000-4000-8000-000000000001',
  '[RPC-TEST] Ponto isolado',
  '[RPC-TEST] Sem endereço real',
  '[RPC-TEST]',
  0,
  'Somente testes',
  true,
  5,
  100,
  0,
  0,
  'pointA',
  true
);

-- ──────────────────────────────────────────────────────────────────────
-- 4. Estoque de teste
-- ──────────────────────────────────────────────────────────────────────
-- Estes itens não devem receber movimentos. A RPC create_request apenas lê
-- disponibilidade; confirm_delivery não faz parte deste roteiro.
insert into public.stock_items (
  id,
  category,
  sizes,
  quantity,
  condition,
  location,
  school,
  donor_name
) values
  ('52504354-2000-4000-8000-000000000001', 'camisa',   array['M'],      100, 'novo', '[RPC-TEST] Estoque', '[RPC-TEST]', '[RPC-TEST]'),
  ('52504354-2000-4000-8000-000000000002', 'calca',    array['38'],     100, 'novo', '[RPC-TEST] Estoque', '[RPC-TEST]', '[RPC-TEST]'),
  ('52504354-2000-4000-8000-000000000003', 'agasalho', array['M'],      100, 'novo', '[RPC-TEST] Estoque', '[RPC-TEST]', '[RPC-TEST]'),
  ('52504354-2000-4000-8000-000000000004', 'kit',      array['Único'],  100, 'novo', '[RPC-TEST] Estoque', '[RPC-TEST]', '[RPC-TEST]'),
  ('52504354-2000-4000-8000-000000000005', 'shorts',   array['M'],      100, 'novo', '[RPC-TEST] Estoque', '[RPC-TEST]', '[RPC-TEST]'),
  ('52504354-2000-4000-8000-000000000006', 'jaqueta',  array['M'],      100, 'novo', '[RPC-TEST] Estoque', '[RPC-TEST]', '[RPC-TEST]');

-- ──────────────────────────────────────────────────────────────────────
-- 5. Pedidos históricos
-- ──────────────────────────────────────────────────────────────────────
insert into public.requests (
  id,
  protocol,
  student_id,
  student_name,
  school_name,
  contact_masked,
  status,
  point_id,
  pickup_at,
  notes,
  created_at
) values
  ('52504354-4000-4000-8000-000000000001', 'RPC-TEST-RECENT',    (select user_id from rpc_test_auth_ids where fixture_key = 'student_recent'),    '[RPC-TEST] Entrega recente',  '[RPC-TEST] Escola', 'Protegido', 'delivered', '52504354-1000-4000-8000-000000000001', (select fixture_now - interval '1 month' from rpc_test_clock), '[RPC-TEST] entrega recente',  (select fixture_now - interval '2 months' from rpc_test_clock)),
  ('52504354-4000-4000-8000-000000000002', 'RPC-TEST-DEADLINE',  (select user_id from rpc_test_auth_ids where fixture_key = 'student_deadline'),  '[RPC-TEST] Vencimento exato', '[RPC-TEST] Escola', 'Protegido', 'delivered', '52504354-1000-4000-8000-000000000001', (select fixture_now - interval '6 months' from rpc_test_clock), '[RPC-TEST] vencimento exato', (select exact_deadline_delivery - interval '1 day' from rpc_test_clock)),
  ('52504354-4000-4000-8000-000000000003', 'RPC-TEST-MIXED',     (select user_id from rpc_test_auth_ids where fixture_key = 'student_mixed'),     '[RPC-TEST] Pedido misto',     '[RPC-TEST] Escola', 'Protegido', 'delivered', '52504354-1000-4000-8000-000000000001', (select fixture_now - interval '1 month' from rpc_test_clock), '[RPC-TEST] categoria bloqueada', (select fixture_now - interval '2 months' from rpc_test_clock)),
  ('52504354-4000-4000-8000-000000000004', 'RPC-TEST-CANCELLED', (select user_id from rpc_test_auth_ids where fixture_key = 'student_cancelled'), '[RPC-TEST] Pedido cancelado', '[RPC-TEST] Escola', 'Protegido', 'cancelled', '52504354-1000-4000-8000-000000000001', (select fixture_now - interval '1 month' from rpc_test_clock), '[RPC-TEST] cancelado', (select fixture_now - interval '2 months' from rpc_test_clock));

-- ──────────────────────────────────────────────────────────────────────
-- 6. Itens dos pedidos históricos
-- ──────────────────────────────────────────────────────────────────────
insert into public.request_items (
  id,
  request_id,
  category,
  size,
  quantity_requested,
  quantity_approved
) values
  ('52504354-5000-4000-8000-000000000001', '52504354-4000-4000-8000-000000000001', 'camisa', 'M',     1, 1),
  ('52504354-5000-4000-8000-000000000002', '52504354-4000-4000-8000-000000000002', 'shorts', 'M',     1, 1),
  ('52504354-5000-4000-8000-000000000003', '52504354-4000-4000-8000-000000000003', 'camisa', 'M',     1, 1),
  ('52504354-5000-4000-8000-000000000004', '52504354-4000-4000-8000-000000000004', 'kit',    'Único', 1, 0);

-- ──────────────────────────────────────────────────────────────────────
-- 7. Entregas históricas
-- ──────────────────────────────────────────────────────────────────────
-- photo_path e signature_path são apenas referências de fixture; nenhum
-- objeto é criado no Storage.
insert into public.deliveries (
  request_id,
  receipt_number,
  photo_path,
  signature_path,
  delivered_at,
  collector_id,
  collector_name
) values
  ('52504354-4000-4000-8000-000000000001', 'RPC-TEST-ENT-RECENT',   'rpc-test/recent/photo.jpg',   'rpc-test/recent/signature.svg',   (select fixture_now - interval '1 month' from rpc_test_clock), (select user_id from rpc_test_auth_ids where fixture_key = 'collector'), '[RPC-TEST] Coletor'),
  ('52504354-4000-4000-8000-000000000002', 'RPC-TEST-ENT-DEADLINE', 'rpc-test/deadline/photo.jpg', 'rpc-test/deadline/signature.svg', (select exact_deadline_delivery from rpc_test_clock),             (select user_id from rpc_test_auth_ids where fixture_key = 'collector'), '[RPC-TEST] Coletor'),
  ('52504354-4000-4000-8000-000000000003', 'RPC-TEST-ENT-MIXED',    'rpc-test/mixed/photo.jpg',    'rpc-test/mixed/signature.svg',    (select fixture_now - interval '1 month' from rpc_test_clock), (select user_id from rpc_test_auth_ids where fixture_key = 'collector'), '[RPC-TEST] Coletor');

-- ──────────────────────────────────────────────────────────────────────
-- 8. Pedido aberto
-- ──────────────────────────────────────────────────────────────────────
insert into public.requests (
  id,
  protocol,
  student_id,
  student_name,
  school_name,
  contact_masked,
  status,
  point_id,
  pickup_at,
  notes,
  created_at
) values (
  '52504354-4000-4000-8000-000000000005',
  'RPC-TEST-OPEN',
  (select user_id from rpc_test_auth_ids where fixture_key = 'student_open'),
  '[RPC-TEST] Pedido aberto',
  '[RPC-TEST] Escola',
  'Protegido',
  'approved',
  '52504354-1000-4000-8000-000000000001',
  (select fixture_now + interval '3 days' from rpc_test_clock),
  '[RPC-TEST] categoria em andamento',
  (select fixture_now - interval '1 day' from rpc_test_clock)
);

insert into public.request_items (
  id,
  request_id,
  category,
  size,
  quantity_requested,
  quantity_approved
) values (
  '52504354-5000-4000-8000-000000000005',
  '52504354-4000-4000-8000-000000000005',
  'agasalho',
  'M',
  1,
  1
);

-- ──────────────────────────────────────────────────────────────────────
-- 9. Dados para isolamento de RLS
-- ──────────────────────────────────────────────────────────────────────
-- student_owner_a não recebe pedido prévio. O pedido abaixo pertence somente
-- a student_owner_b e deve ficar invisível para owner_a.
insert into public.requests (
  id,
  protocol,
  student_id,
  student_name,
  school_name,
  contact_masked,
  status,
  point_id,
  pickup_at,
  notes,
  created_at
) values (
  '52504354-4000-4000-8000-000000000006',
  'RPC-TEST-OWNER-B',
  (select user_id from rpc_test_auth_ids where fixture_key = 'student_owner_b'),
  '[RPC-TEST] Proprietário B',
  '[RPC-TEST] Escola',
  'Protegido',
  'in_review',
  '52504354-1000-4000-8000-000000000001',
  (select fixture_now + interval '3 days' from rpc_test_clock),
  '[RPC-TEST] isolamento RLS',
  (select fixture_now from rpc_test_clock)
);

insert into public.request_items (
  id,
  request_id,
  category,
  size,
  quantity_requested,
  quantity_approved
) values (
  '52504354-5000-4000-8000-000000000006',
  '52504354-4000-4000-8000-000000000006',
  'jaqueta',
  'M',
  1,
  0
);

-- Eventos usam IDs fixos e não são necessários para a elegibilidade, mas
-- mantêm os pedidos históricos coerentes para leitura pelo aplicativo.
insert into public.request_events (id, request_id, label, created_at) values
  ('52504354-6000-4000-8000-000000000001', '52504354-4000-4000-8000-000000000001', 'Retirada realizada', (select fixture_now - interval '1 month' from rpc_test_clock)),
  ('52504354-6000-4000-8000-000000000002', '52504354-4000-4000-8000-000000000002', 'Retirada realizada', (select exact_deadline_delivery from rpc_test_clock)),
  ('52504354-6000-4000-8000-000000000003', '52504354-4000-4000-8000-000000000003', 'Retirada realizada', (select fixture_now - interval '1 month' from rpc_test_clock)),
  ('52504354-6000-4000-8000-000000000004', '52504354-4000-4000-8000-000000000004', 'Solicitação enviada', (select fixture_now - interval '2 months' from rpc_test_clock)),
  ('52504354-6000-4000-8000-000000000005', '52504354-4000-4000-8000-000000000005', 'Solicitação analisada', (select fixture_now - interval '1 day' from rpc_test_clock)),
  ('52504354-6000-4000-8000-000000000006', '52504354-4000-4000-8000-000000000006', 'Solicitação enviada', (select fixture_now from rpc_test_clock));

-- Após este commit, o fixture de deadline comprova o comportamento "no ou
-- após o vencimento". Para provar igualdade no mesmo microssegundo, execute a
-- chamada autenticada de create_request na mesma transação, antes do commit,
-- em um roteiro SQL de teste separado. Este arquivo não chama nenhuma RPC.
commit;

-- ──────────────────────────────────────────────────────────────────────
-- Concorrência (EXECUTAR SEPARADAMENTE, NÃO FAZ PARTE DOS INSERTS ACIMA)
-- ──────────────────────────────────────────────────────────────────────
-- Use student_concurrent em duas sessões autenticadas independentes.
-- Envie simultaneamente a mesma categoria e o ponto:
--   point_id = 52504354-1000-4000-8000-000000000001
--   item = {"category":"jaqueta","size":"M","quantity":1}
-- Registre o UUID retornado pela chamada vencedora. A segunda chamada deve
-- aguardar o lock e falhar por pedido aberto. Não chame confirm_delivery.

-- ──────────────────────────────────────────────────────────────────────
-- 10. Limpeza por IDs exatos (BLOCO DESABILITADO)
-- ──────────────────────────────────────────────────────────────────────
-- Remova os delimitadores /* e */ somente após substituir novamente os
-- placeholders Auth abaixo. Execute a limpeza antes de remover manualmente
-- os usuários Auth; a exclusão Auth posterior removerá profiles/settings.
/*
begin;

create temporary table rpc_test_cleanup_users (
  user_id uuid primary key
) on commit drop;

insert into rpc_test_cleanup_users (user_id) values
  ('00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-4000-8000-000000000102'),
  ('00000000-0000-4000-8000-000000000103'),
  ('00000000-0000-4000-8000-000000000104'),
  ('00000000-0000-4000-8000-000000000105'),
  ('00000000-0000-4000-8000-000000000106'),
  ('00000000-0000-4000-8000-000000000107'),
  ('00000000-0000-4000-8000-000000000108'),
  ('00000000-0000-4000-8000-000000000109'),
  ('00000000-0000-4000-8000-000000000110'),
  ('00000000-0000-4000-8000-000000000111'),
  ('00000000-0000-4000-8000-000000000199');

-- Captura pedidos fixos e pedidos gerados pelas RPCs antes de removê-los.
create temporary table rpc_test_cleanup_requests (
  request_id uuid primary key
) on commit drop;

insert into rpc_test_cleanup_requests (request_id)
select id
  from public.requests
 where student_id in (select user_id from rpc_test_cleanup_users);

delete from public.audit_logs
 where actor_id in (select user_id from rpc_test_cleanup_users)
    or (
      entity = 'requests'
      and entity_id in (
        select request_id::text
          from rpc_test_cleanup_requests
      )
    );

delete from public.notifications
 where user_id in (select user_id from rpc_test_cleanup_users);

-- Cascades removem request_items, request_events, pickup_codes e deliveries.
delete from public.requests
 where id in (select request_id from rpc_test_cleanup_requests);

delete from public.enrollments
 where id in (
  '52504354-3000-4000-8000-000000000001',
  '52504354-3000-4000-8000-000000000002',
  '52504354-3000-4000-8000-000000000003',
  '52504354-3000-4000-8000-000000000004',
  '52504354-3000-4000-8000-000000000005',
  '52504354-3000-4000-8000-000000000006',
  '52504354-3000-4000-8000-000000000007',
  '52504354-3000-4000-8000-000000000008',
  '52504354-3000-4000-8000-000000000009',
  '52504354-3000-4000-8000-000000000010'
);

do $movement_cleanup_preflight$
begin
  if exists (
    select 1
      from public.stock_movements
     where responsible_id in (select user_id from rpc_test_cleanup_users)
       and (
         stock_item_id is null
         or stock_item_id not in (
           '52504354-2000-4000-8000-000000000001',
           '52504354-2000-4000-8000-000000000002',
           '52504354-2000-4000-8000-000000000003',
           '52504354-2000-4000-8000-000000000004',
           '52504354-2000-4000-8000-000000000005',
           '52504354-2000-4000-8000-000000000006'
         )
       )
  ) then
    raise exception 'RPC-TEST: movimento fora do estoque de teste exige revisão manual; limpeza interrompida.';
  end if;
end
$movement_cleanup_preflight$;

delete from public.stock_movements
 where stock_item_id in (
   '52504354-2000-4000-8000-000000000001',
   '52504354-2000-4000-8000-000000000002',
   '52504354-2000-4000-8000-000000000003',
   '52504354-2000-4000-8000-000000000004',
   '52504354-2000-4000-8000-000000000005',
   '52504354-2000-4000-8000-000000000006'
 );

delete from public.stock_items
 where id in (
   '52504354-2000-4000-8000-000000000001',
   '52504354-2000-4000-8000-000000000002',
   '52504354-2000-4000-8000-000000000003',
   '52504354-2000-4000-8000-000000000004',
   '52504354-2000-4000-8000-000000000005',
   '52504354-2000-4000-8000-000000000006'
 );

delete from public.collection_points
 where id = '52504354-1000-4000-8000-000000000001';

commit;

-- Depois do commit, remova manualmente somente os 12 usuários Auth de teste.
-- Não execute DELETE em auth.users por este arquivo.
*/
