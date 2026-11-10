-- Ajustes apontados pelos advisors do Supabase.
-- 2. RLS: auth.uid() e helpers avaliados uma vez por consulta (lint 0003),
--    sem mudar quem enxerga o quê — as expressões são as mesmas.
-- 3. Índices nas chaves estrangeiras sem cobertura (lint 0001).

-- 2 ─────────────────────────────────────────────────────────────────────────
alter policy "perfil próprio" on public.profiles
  using (id = (select auth.uid()));
alter policy "editar perfil próprio" on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy "atendimentos próprios" on public.support_tickets
  using (user_id = (select auth.uid()));

alter policy "configurações próprias" on public.user_settings
  using (user_id = (select auth.uid()));
alter policy "criar configurações próprias" on public.user_settings
  with check (user_id = (select auth.uid()));
alter policy "editar configurações próprias" on public.user_settings
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "código só do aluno ativo" on public.pickup_codes
  using ((select public.current_user_is_active()) and student_id = (select auth.uid()));

alter policy "entregas da equipe ou do aluno ativo" on public.deliveries
  using (
    (select public.current_user_is_active())
    and (
      (select public.is_collector())
      or exists (select 1 from public.requests r where r.id = deliveries.request_id and r.student_id = (select auth.uid()))
    )
  );

alter policy "catálogo de estoque para contas ativas" on public.stock_items
  using (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.status = 'active'
        and profiles.role = any (array['student', 'donor', 'collector'])
    )
  );

alter policy "matrícula própria de conta ativa" on public.enrollments
  using ((select public.current_user_is_active()) and student_id = (select auth.uid()));

alter policy "doações próprias ou equipe ativa" on public.donations
  using ((select public.current_user_is_active()) and (donor_id = (select auth.uid()) or (select public.is_collector())));

alter policy "pedidos próprios ou equipe ativa" on public.requests
  using ((select public.current_user_is_active()) and (student_id = (select auth.uid()) or (select public.is_collector())));

alter policy "itens visíveis com o pedido para conta ativa" on public.request_items
  using (
    (select public.current_user_is_active())
    and exists (
      select 1 from public.requests r
      where r.id = request_items.request_id and (r.student_id = (select auth.uid()) or (select public.is_collector()))
    )
  );

alter policy "eventos visíveis com o pedido para conta ativa" on public.request_events
  using (
    (select public.current_user_is_active())
    and exists (
      select 1 from public.requests r
      where r.id = request_events.request_id and (r.student_id = (select auth.uid()) or (select public.is_collector()))
    )
  );

alter policy "notificações próprias de conta ativa" on public.notifications
  using ((select public.current_user_is_active()) and user_id = (select auth.uid()));
alter policy "marcar notificações próprias de conta ativa" on public.notifications
  using ((select public.current_user_is_active()) and user_id = (select auth.uid()))
  with check ((select public.current_user_is_active()) and user_id = (select auth.uid()));

-- 3 ─────────────────────────────────────────────────────────────────────────
create index if not exists deliveries_collector_id_idx on public.deliveries (collector_id);
create index if not exists donations_point_id_idx on public.donations (point_id);
create index if not exists donations_reviewed_by_idx on public.donations (reviewed_by);
create index if not exists enrollments_reviewed_by_idx on public.enrollments (reviewed_by);
create index if not exists pickup_codes_student_id_idx on public.pickup_codes (student_id);
create index if not exists requests_point_id_idx on public.requests (point_id);
create index if not exists stock_movements_responsible_id_idx on public.stock_movements (responsible_id);
create index if not exists stock_movements_stock_item_id_idx on public.stock_movements (stock_item_id);
