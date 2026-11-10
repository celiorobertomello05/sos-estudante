-- Revisão pela equipe no aplicativo. Antes, matrícula, CadÚnico e
-- coletores só podiam ser aprovados editando tabelas no painel do Supabase, e a
-- equipe não conseguia ver os documentos enviados.
--
-- * Quem revisa: coletor com conta ativa (public.is_collector()), o mesmo
--   perfil que já faz triagem, estoque e entregas. Um papel administrativo
--   separado pode vir depois. O primeiro coletor ainda precisa ser
--   ativado no painel.
-- * Leitura: RPCs SECURITY DEFINER devolvem só os pendentes e só os campos
--   necessários; profiles e enrollments continuam com RLS "somente o dono".
-- * Documentos: a equipe ativa lê (somente SELECT) arquivos do bucket
--   documents cujo dono tem revisão pendente (matrícula ativa pendente ou
--   coletor pendente). Nenhuma escrita nova é liberada.

begin;

alter table public.enrollments
  add column if not exists review_note text check (char_length(review_note) <= 300),
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null;

-- ───────────── Documentos visíveis para a equipe ─────────────
create or replace function public.can_review_documents_of(p_owner text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_collector()
     and p_owner is not null
     and p_owner <> auth.uid()::text
     and (
       exists (
         select 1 from public.enrollments e
          where e.student_id::text = p_owner and e.is_active and e.status = 'pending'
       )
       or exists (
         select 1 from public.profiles p
          where p.id::text = p_owner and p.role = 'collector' and p.status = 'pending'
       )
     );
$$;

revoke execute on function public.can_review_documents_of(text) from public, anon;
grant execute on function public.can_review_documents_of(text) to authenticated;

drop policy if exists "documentos em revisão para equipe ativa" on storage.objects;
create policy "documentos em revisão para equipe ativa"
on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and public.can_review_documents_of((storage.foldername(name))[1])
);

-- ───────────── Listas de pendências ─────────────
create or replace function public.list_pending_enrollments()
returns table (
  enrollment_id uuid,
  student_id uuid,
  student_name text,
  school_name text,
  enrollment_number text,
  grade text,
  valid_until text,
  document_path text,
  cadunico_document_path text,
  submitted_at timestamptz,
  student_files text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_collector() then
    raise exception 'NOT_ALLOWED';
  end if;
  return query
    select e.id, e.student_id, p.full_name, e.school_name, e.enrollment_number, e.grade,
           e.valid_until, e.document_path, e.cadunico_document_path, e.created_at,
           coalesce((
             select array_agg(o.name order by o.name)
               from storage.objects o
              where o.bucket_id = 'documents'
                and (storage.foldername(o.name))[1] = e.student_id::text
           ), '{}')
      from public.enrollments e
      join public.profiles p on p.id = e.student_id
     where e.is_active and e.status = 'pending'
     order by e.created_at;
end $$;

revoke execute on function public.list_pending_enrollments() from public, anon;
grant execute on function public.list_pending_enrollments() to authenticated;

create or replace function public.list_pending_collectors()
returns table (
  profile_id uuid,
  full_name text,
  email text,
  phone text,
  created_at timestamptz,
  files text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_collector() then
    raise exception 'NOT_ALLOWED';
  end if;
  return query
    select p.id, p.full_name, p.email, p.phone, p.created_at,
           coalesce((
             select array_agg(o.name order by o.name)
               from storage.objects o
              where o.bucket_id = 'documents'
                and (storage.foldername(o.name))[1] = p.id::text
           ), '{}')
      from public.profiles p
     where p.role = 'collector' and p.status = 'pending'
     order by p.created_at;
end $$;

revoke execute on function public.list_pending_collectors() from public, anon;
grant execute on function public.list_pending_collectors() to authenticated;

-- ───────────── Decisões ─────────────
create or replace function public.review_enrollment(
  p_enrollment_id uuid,
  p_decision text,
  p_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment public.enrollments;
  v_note text := nullif(left(trim(coalesce(p_note, '')), 300), '');
begin
  if not public.is_collector() then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_decision not in ('verify', 'reject') then
    raise exception 'BUSINESS_RULE: Decisão inválida.';
  end if;
  if p_decision = 'reject' and v_note is null then
    raise exception 'BUSINESS_RULE: Informe o motivo da recusa para o estudante.';
  end if;

  select * into v_enrollment from public.enrollments where id = p_enrollment_id;
  if not found then
    raise exception 'BUSINESS_RULE: Matrícula não encontrada.';
  end if;
  if v_enrollment.student_id = auth.uid() then
    raise exception 'NOT_ALLOWED';
  end if;

  -- Mesmo lock de create_request: a elegibilidade do aluno muda aqui.
  perform 1 from public.profiles where id = v_enrollment.student_id for update;

  select * into v_enrollment from public.enrollments where id = p_enrollment_id for update;
  if not v_enrollment.is_active or v_enrollment.status <> 'pending' then
    raise exception 'BUSINESS_RULE: Esta matrícula já foi revisada ou foi substituída por um envio mais recente.';
  end if;
  if p_decision = 'verify' and (v_enrollment.document_path is null or v_enrollment.cadunico_document_path is null) then
    raise exception 'BUSINESS_RULE: A matrícula precisa da declaração e da folha resumo do CadÚnico para ser validada.';
  end if;

  update public.enrollments
     set status = case when p_decision = 'verify' then 'verified' else 'rejected' end,
         review_note = v_note,
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_enrollment_id;

  if p_decision = 'verify' then
    perform public.notify(v_enrollment.student_id, 'Matrícula validada',
      'Sua matrícula e o CadÚnico foram validados. Você já pode solicitar itens.', 'success');
  else
    perform public.notify(v_enrollment.student_id, 'Matrícula recusada',
      'Motivo: ' || v_note || ' Envie os documentos novamente na tela de matrícula.', 'info');
  end if;
  perform public.audit('review_enrollment', 'enrollments', p_enrollment_id::text,
    jsonb_build_object('decision', p_decision));
end $$;

revoke execute on function public.review_enrollment(uuid, text, text) from public, anon;
grant execute on function public.review_enrollment(uuid, text, text) to authenticated;

create or replace function public.review_collector(
  p_profile_id uuid,
  p_decision text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_collector() then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_decision not in ('approve', 'reject') then
    raise exception 'BUSINESS_RULE: Decisão inválida.';
  end if;
  if p_profile_id = auth.uid() then
    raise exception 'NOT_ALLOWED';
  end if;

  select * into v_profile from public.profiles where id = p_profile_id for update;
  if not found or v_profile.role is distinct from 'collector' or v_profile.status <> 'pending' then
    raise exception 'BUSINESS_RULE: Este cadastro de coletor já foi revisado.';
  end if;

  update public.profiles
     set status = case when p_decision = 'approve' then 'active' else 'blocked' end
   where id = p_profile_id;

  if p_decision = 'approve' then
    perform public.notify(p_profile_id, 'Cadastro aprovado',
      'Seu cadastro de coletor foi aprovado. As ações da equipe já estão liberadas.', 'success');
  end if;
  perform public.audit('review_collector', 'profiles', p_profile_id::text,
    jsonb_build_object('decision', p_decision));
end $$;

revoke execute on function public.review_collector(uuid, text) from public, anon;
grant execute on function public.review_collector(uuid, text) to authenticated;

commit;
