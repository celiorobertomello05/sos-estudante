-- Cadastro de pontos de coleta pela equipe.
--
-- Antes, pontos só entravam direto no banco (painel do Supabase). Agora um
-- coletor com conta ativa cadastra pelo aplicativo, por uma RPC que valida
-- tudo no servidor. Não há INSERT direto na tabela: o app continua só lendo.
-- Os campos de avaliação, distância e imagem usam os valores padrão da tabela
-- (distance_km é recalculado pelo aparelho a partir da origem escolhida).

begin;

create or replace function public.create_collection_point(
  p_name text,
  p_address text,
  p_district text,
  p_hours text,
  p_capacity integer,
  p_latitude double precision,
  p_longitude double precision
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_address text := trim(coalesce(p_address, ''));
  v_district text := trim(coalesce(p_district, ''));
  v_hours text := trim(coalesce(p_hours, ''));
  v_id uuid;
begin
  if not public.is_collector() then
    raise exception 'NOT_ALLOWED';
  end if;
  if char_length(v_name) not between 3 and 80 then
    raise exception 'BUSINESS_RULE: Informe o nome do ponto (3 a 80 caracteres).';
  end if;
  if char_length(v_address) not between 5 and 150 then
    raise exception 'BUSINESS_RULE: Informe o endereço completo (5 a 150 caracteres).';
  end if;
  if char_length(v_district) not between 2 and 60 then
    raise exception 'BUSINESS_RULE: Informe o bairro.';
  end if;
  if char_length(v_hours) not between 3 and 80 then
    raise exception 'BUSINESS_RULE: Informe o horário de funcionamento.';
  end if;
  if p_capacity is null or p_capacity not between 1 and 100 then
    raise exception 'BUSINESS_RULE: A capacidade deve ficar entre 1 e 100.';
  end if;
  if p_latitude is null or p_longitude is null
     or p_latitude not between -90 and 90
     or p_longitude not between -180 and 180 then
    raise exception 'BUSINESS_RULE: Localização inválida. Confira o endereço.';
  end if;
  if exists (
    select 1 from public.collection_points
     where lower(name) = lower(v_name) and lower(address) = lower(v_address)
  ) then
    raise exception 'BUSINESS_RULE: Este ponto já está cadastrado.';
  end if;

  insert into public.collection_points (name, address, district, hours, capacity, latitude, longitude)
  values (v_name, v_address, v_district, v_hours, p_capacity, p_latitude, p_longitude)
  returning id into v_id;

  perform public.audit('create_collection_point', 'collection_points', v_id::text);
  return v_id;
end $$;

revoke execute on function public.create_collection_point(text, text, text, text, integer, double precision, double precision) from public, anon;
grant execute on function public.create_collection_point(text, text, text, text, integer, double precision, double precision) to authenticated;

commit;
