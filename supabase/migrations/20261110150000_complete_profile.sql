-- Completar cadastro após login Google.
--
-- O Google só autentica: a pessoa ainda informa os mesmos dados do cadastro
-- por e-mail (CPF/CNPJ, RG, nascimento, telefone, CEP e endereço) e envia os
-- documentos. O login Google fica vinculado a esta conta.
--
-- * profiles.rg: número do RG (pessoa física), também gravado pelo cadastro
--   por e-mail via metadados (handle_new_user).
-- * complete_profile: grava os dados uma única vez (só quando o documento
--   ainda está vazio); depois, CPF/RG/nascimento não mudam pelo app.

begin;

alter table public.profiles
  add column if not exists rg text check (rg ~ '^[0-9A-Za-z]{5,14}$');

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_role text := new.raw_user_meta_data ->> 'role';
  v_rg text := nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'rg', ''), '[^0-9A-Za-z]', '', 'g'), '');
begin
  if v_role not in ('student', 'donor', 'collector') then
    v_role := null;
  end if;
  if v_rg is not null and v_rg !~ '^[0-9A-Za-z]{5,14}$' then
    v_rg := null;
  end if;
  insert into public.profiles (id, role, status, full_name, email, phone, document, rg, birth_date, donor_kind, postal_code, address)
  values (
    new.id,
    v_role,
    case when v_role = 'collector' then 'pending' else 'active' end,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 120),
    coalesce(new.email, ''),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g'), ''),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'document', ''), '\D', '', 'g'), ''),
    v_rg,
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    case when new.raw_user_meta_data ->> 'donor_kind' in ('individual', 'company') then new.raw_user_meta_data ->> 'donor_kind' end,
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'postal_code', ''), '\D', '', 'g'), ''),
    nullif(left(new.raw_user_meta_data ->> 'address', 200), '')
  );
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;

create or replace function public.complete_profile(
  p_full_name text,
  p_document text,
  p_rg text,
  p_birth_date date,
  p_donor_kind text,
  p_phone text,
  p_postal_code text,
  p_address text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_document text := regexp_replace(coalesce(p_document, ''), '\D', '', 'g');
  v_rg text := nullif(regexp_replace(coalesce(p_rg, ''), '[^0-9A-Za-z]', '', 'g'), '');
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_cep text := regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g');
  v_company boolean;
begin
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if not found or v_profile.role is null then
    raise exception 'NOT_ALLOWED';
  end if;
  if v_profile.document is not null then
    raise exception 'BUSINESS_RULE: O cadastro já foi concluído. Para corrigir CPF ou RG, fale com o suporte.';
  end if;

  v_company := v_profile.role = 'donor' and p_donor_kind = 'company';
  if char_length(trim(coalesce(p_full_name, ''))) < 5 then
    raise exception 'BUSINESS_RULE: Informe o nome completo.';
  end if;
  if (v_company and v_document !~ '^\d{14}$') or (not v_company and v_document !~ '^\d{11}$') then
    raise exception 'BUSINESS_RULE: Documento inválido.';
  end if;
  if not v_company and (v_rg is null or v_rg !~ '^[0-9A-Za-z]{5,14}$') then
    raise exception 'BUSINESS_RULE: Informe o número do RG.';
  end if;
  if v_profile.role = 'student' and (p_birth_date is null or p_birth_date > current_date) then
    raise exception 'BUSINESS_RULE: Informe a data de nascimento.';
  end if;
  if v_phone !~ '^\d{10,11}$' then
    raise exception 'BUSINESS_RULE: Telefone inválido.';
  end if;
  if v_cep !~ '^\d{8}$' then
    raise exception 'BUSINESS_RULE: CEP inválido.';
  end if;
  if char_length(trim(coalesce(p_address, ''))) < 5 then
    raise exception 'BUSINESS_RULE: Informe o endereço.';
  end if;

  update public.profiles
     set full_name = left(trim(p_full_name), 120),
         document = v_document,
         rg = case when v_company then null else v_rg end,
         birth_date = case when v_profile.role = 'student' then p_birth_date else birth_date end,
         donor_kind = case when v_profile.role = 'donor' then
                        case when v_company then 'company' else 'individual' end
                      else donor_kind end,
         phone = v_phone,
         postal_code = v_cep,
         address = left(trim(p_address), 200)
   where id = auth.uid();

  perform public.audit('complete_profile', 'profiles', auth.uid()::text);
end $$;

revoke execute on function public.complete_profile(text, text, text, date, text, text, text, text) from public, anon;
grant execute on function public.complete_profile(text, text, text, date, text, text, text, text) to authenticated;

commit;
