-- Tests de las dos intenciones (migración 0014).
-- Correr sobre una base limpia: stub + schema_completo + 0009.
--
-- Reglas que se verifican:
--   match   → no aparece gente de tu mismo género
--   estudio → solo aparece gente de tu misma carrera

\set QUIET on
\set ON_ERROR_STOP off

insert into auth.users (id, email) values
  ('d0000000-0000-0000-0000-000000000001', 'dos-ana@test.com'),
  ('d0000000-0000-0000-0000-000000000002', 'dos-beto@test.com'),
  ('d0000000-0000-0000-0000-000000000003', 'dos-caro@test.com'),
  ('d0000000-0000-0000-0000-000000000004', 'dos-dani@test.com'),
  ('d0000000-0000-0000-0000-000000000005', 'dos-elu@test.com');

-- Dos carreras distintas para poder probar el filtro de estudio.
insert into carreras (nombre, facultad) values
  ('Carrera Test A', 'Facultad Test'),
  ('Carrera Test B', 'Facultad Test')
on conflict (nombre) do nothing;

-- Ana: femenino, Carrera A. Es la que mira en casi todos los casos.
-- Beto: masculino, Carrera A   → match SÍ (distinto género), estudio SÍ (misma carrera)
-- Caro: femenino,  Carrera A   → match NO (mismo género),    estudio SÍ
-- Dani: masculino, Carrera B   → match SÍ,                   estudio NO (otra carrera)
-- Elu:  no_binario, Carrera A  → match SÍ (distinto género),  estudio SÍ
insert into profiles (id, nombre, fecha_nacimiento, genero, carrera_id, onboarding_completo)
values
  ('d0000000-0000-0000-0000-000000000001', 'Ana',  '2002-03-01', 'femenino',
    (select id from carreras where nombre = 'Carrera Test A'), true),
  ('d0000000-0000-0000-0000-000000000002', 'Beto', '2001-05-10', 'masculino',
    (select id from carreras where nombre = 'Carrera Test A'), true),
  ('d0000000-0000-0000-0000-000000000003', 'Caro', '2001-07-20', 'femenino',
    (select id from carreras where nombre = 'Carrera Test A'), true),
  ('d0000000-0000-0000-0000-000000000004', 'Dani', '2002-01-15', 'masculino',
    (select id from carreras where nombre = 'Carrera Test B'), true),
  ('d0000000-0000-0000-0000-000000000005', 'Elu',  '2002-09-09', 'no_binario',
    (select id from carreras where nombre = 'Carrera Test A'), true);

-- Todos declaran las dos intenciones.
insert into profile_intenciones (profile_id, intencion)
select id, i
from profiles
cross join (values ('match'::intencion), ('estudio'::intencion)) as t(i)
where id::text like 'd0000000%';

set request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';

\set QUIET off

\echo ''
\echo '=== DOS 1: el enum quedo en match y estudio ==='
\echo '--- esperado: estudio, match'
select string_agg(enumlabel, ', ' order by enumlabel) as valores
from pg_enum e join pg_type t on t.oid = e.enumtypid
where t.typname = 'intencion';

\echo ''
\echo '=== DOS 2: MATCH no muestra gente del mismo genero ==='
\echo '--- Ana es femenino; esperado: Beto, Dani, Elu (sin Caro)'
select coalesce(string_agg(nombre, ', ' order by nombre), '(vacio)') as feed_match
from get_candidatos('match', 10);

\echo ''
\echo '=== DOS 3: ESTUDIO solo muestra la misma carrera ==='
\echo '--- Ana es Carrera A; esperado: Beto, Caro, Elu (sin Dani, que es B)'
select coalesce(string_agg(nombre, ', ' order by nombre), '(vacio)') as feed_estudio
from get_candidatos('estudio', 10);

\echo ''
\echo '=== DOS 4: quien no tiene carrera no ve a nadie en estudio ==='
update profiles set carrera_id = null
where id = 'd0000000-0000-0000-0000-000000000001';
\echo '--- esperado: (vacio)'
select coalesce(string_agg(nombre, ', ' order by nombre), '(vacio)') as feed_sin_carrera
from get_candidatos('estudio', 10);
\echo '--- pero en match sigue viendo: esperado Beto, Dani, Elu'
select coalesce(string_agg(nombre, ', ' order by nombre), '(vacio)') as match_sin_carrera
from get_candidatos('match', 10);
update profiles set carrera_id = (select id from carreras where nombre = 'Carrera Test A')
where id = 'd0000000-0000-0000-0000-000000000001';

\echo ''
\echo '=== DOS 5: un no binario ve a todos menos a otro no binario ==='
set request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000005';
\echo '--- Elu es no_binario; esperado: Ana, Beto, Caro, Dani'
select coalesce(string_agg(nombre, ', ' order by nombre), '(vacio)') as feed_elu
from get_candidatos('match', 10);
set request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';

\echo ''
\echo '=== DOS 6: el match reciproco sigue funcionando en match ==='
insert into swipes (emisor_id, receptor_id, direccion, intencion) values
  ('d0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'like', 'match'),
  ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'like', 'match');
\echo '--- esperado: 1 fila, intencion match'
select count(*) as matches, max(intencion::text) as intencion
from matches
where profile_a::text like 'd0000000%';

\echo ''
\echo '=== DOS 7: ya no se puede insertar amistad ==='
do $$
begin
  insert into swipes (emisor_id, receptor_id, direccion, intencion)
  values ('d0000000-0000-0000-0000-000000000001',
          'd0000000-0000-0000-0000-000000000003', 'like', 'amistad');
  raise notice 'FALLO: acepto amistad';
exception when others then
  raise notice 'OK: rechazado (%)', sqlerrm;
end $$;
