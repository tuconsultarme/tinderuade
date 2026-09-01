-- Tests de mis_likes_recibidos() (migración 0015).

\set QUIET on
\set ON_ERROR_STOP off

insert into auth.users (id, email) values
  ('e0000000-0000-0000-0000-000000000001', 'lk-ana@test.com'),
  ('e0000000-0000-0000-0000-000000000002', 'lk-beto@test.com'),
  ('e0000000-0000-0000-0000-000000000003', 'lk-caro@test.com'),
  ('e0000000-0000-0000-0000-000000000004', 'lk-dani@test.com'),
  ('e0000000-0000-0000-0000-000000000005', 'lk-evo@test.com');

insert into profiles (id, nombre, fecha_nacimiento, genero, carrera_id, onboarding_completo, activo)
values
  ('e0000000-0000-0000-0000-000000000001', 'Ana',  '2002-03-01', 'femenino',  1, true,  true),
  ('e0000000-0000-0000-0000-000000000002', 'Beto', '2001-05-10', 'masculino', 1, true,  true),
  ('e0000000-0000-0000-0000-000000000003', 'Caro', '2001-07-20', 'femenino',  1, true,  true),
  ('e0000000-0000-0000-0000-000000000004', 'Dani', '2002-01-15', 'masculino', 1, true,  false), -- de baja
  ('e0000000-0000-0000-0000-000000000005', 'Evo',  '2002-02-02', 'masculino', 1, false, true);  -- sin onboarding

-- Los cuatro le dan like a Ana.
insert into swipes (emisor_id, receptor_id, direccion, intencion) values
  ('e0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'like', 'match'),
  ('e0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'like', 'match'),
  ('e0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'like', 'match'),
  ('e0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 'like', 'match');

set request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000001';

\set QUIET off

\echo ''
\echo '=== LK 1: lista base ==='
\echo '--- esperado: Beto, Caro (Dani esta de baja, Evo sin onboarding)'
select coalesce(string_agg(nombre, ', ' order by nombre), '(vacio)') as recibidos
from mis_likes_recibidos();

\echo ''
\echo '=== LK 2: si ya le respondi, desaparece de la lista ==='
insert into swipes (emisor_id, receptor_id, direccion, intencion)
values ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'like', 'match');
\echo '--- esperado: solo Caro'
select coalesce(string_agg(nombre, ', ' order by nombre), '(vacio)') as tras_responder
from mis_likes_recibidos();

\echo ''
\echo '=== LK 3: BLOQUEO — quien me bloqueo NO debe aparecer ==='
\echo '--- Caro bloquea a Ana; esperado: (vacio)'
insert into bloqueos (bloqueador_id, bloqueado_id)
values ('e0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001');
select coalesce(string_agg(nombre, ', ' order by nombre), '(vacio)') as tras_bloqueo_entrante
from mis_likes_recibidos();

\echo ''
\echo '=== LK 4: BLOQUEO en la otra direccion tampoco aparece ==='
delete from bloqueos
where bloqueador_id = 'e0000000-0000-0000-0000-000000000003';
insert into bloqueos (bloqueador_id, bloqueado_id)
values ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003');
\echo '--- ahora Ana bloqueo a Caro; esperado: (vacio)'
select coalesce(string_agg(nombre, ', ' order by nombre), '(vacio)') as tras_bloqueo_saliente
from mis_likes_recibidos();

\echo ''
\echo '=== LK 5: un tercero no ve los likes de Ana ==='
set request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000002';
\echo '--- Beto consulta lo suyo; esperado: (vacio), nadie le dio like a el'
select coalesce(string_agg(nombre, ', ' order by nombre), '(vacio)') as recibidos_beto
from mis_likes_recibidos();
