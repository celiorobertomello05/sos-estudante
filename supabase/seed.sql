-- Dados de catálogo para desenvolvimento (pontos e estoque inicial).
-- Usuários NÃO são criados aqui: cadastre-se pelo app.
-- Para promover um coletor: no painel do Supabase, altere profiles.status para 'active'.
-- Para validar matrícula: altere enrollments.status para 'verified'.
--
-- collection_points e stock_items não possuem chave natural única. Os UUIDs
-- abaixo são as chaves primárias estáveis deste catálogo; DO NOTHING preserva
-- qualquer alteração feita nos registros após a primeira carga.

insert into public.collection_points (id, name, address, district, distance_km, hours, open_now, rating, capacity, latitude, longitude, image_key) values
  ('10000000-0000-4000-8000-000000000001', 'Ponto Solidário Vila Nova', 'Rua das Acácias, 234', 'Vila Nova', 0.8, 'Seg–Sex 7h–18h', true, 4.8, 85, -23.5489, -46.6388, 'pointA'),
  ('10000000-0000-4000-8000-000000000002', 'ONG Esperança Viva', 'Av. Brasil, 1.120', 'Centro', 1.4, 'Seg–Sáb 8h–17h', true, 4.9, 60, -23.5505, -46.6333, 'pointB'),
  ('10000000-0000-4000-8000-000000000003', 'Centro Comunitário Norte', 'Rua do Sol, 55', 'Zona Norte', 3.2, 'Ter–Sáb 9h–16h', false, 4.6, 40, -23.5000, -46.6200, 'pointC')
on conflict (id) do nothing;

insert into public.stock_items (id, category, sizes, quantity, condition, location, school, donor_name) values
  ('20000000-0000-4000-8000-000000000001', 'camisa', array['P', 'M', 'G', 'GG'], 124, 'muito_bom', 'Estoque A — Prateleira 03', 'EMEF João Paulo II', 'Marcos S.'),
  ('20000000-0000-4000-8000-000000000002', 'calca', array['36', '38', '40', '42'], 87, 'bom', 'Estoque A — Prateleira 05', 'EMEF Central', 'Maria F.'),
  ('20000000-0000-4000-8000-000000000003', 'shorts', array['P', 'M', 'G'], 12, 'novo', 'Estoque B — Prateleira 01', 'EMEF Norte', 'Roberto A.'),
  ('20000000-0000-4000-8000-000000000004', 'jaqueta', array['M', 'G'], 31, 'muito_bom', 'Estoque B — Prateleira 02', 'EMEF Central', 'Carlos M.'),
  ('20000000-0000-4000-8000-000000000005', 'agasalho', array['P', 'M', 'G'], 18, 'bom', 'Estoque A — Prateleira 07', 'EMEF João Paulo II', 'Lucia P.'),
  ('20000000-0000-4000-8000-000000000006', 'kit', array['Único'], 116, 'novo', 'Estoque C — Prateleira 01', 'Todas', 'Papelaria Avenida')
on conflict (id) do nothing;
