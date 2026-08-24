-- Pruebas funcionales del schema de UADencuentros.

\set ON_ERROR_STOP on

-- Tres usuarios: Ana, Beto, Caro
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ana@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'beto@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'caro@test.com');

insert into profiles (id, nombre, fecha_nacimiento, genero, busca_generos, carrera_id, sede_id, onboarding_completo)
values
  ('11111111-1111-1111-1111-111111111111', 'Ana',  '2003-04-10', 'femenino',  '{masculino}', 1, 1, true),
  ('22222222-2222-2222-2222-222222222222', 'Beto', '2002-09-01', 'masculino', '{femenino}',  1, 1, true),
  ('33333333-3333-3333-3333-333333333333', 'Caro', '2004-01-20', 'femenino',  '{femenino}',  2, 1, true);

insert into profile_intenciones (profile_id, intencion) values
  ('11111111-1111-1111-1111-111111111111', 'citas'),
  ('11111111-1111-1111-1111-111111111111', 'estudio'),
  ('22222222-2222-2222-2222-222222222222', 'citas'),
  ('22222222-2222-2222-2222-222222222222', 'estudio'),
  ('33333333-3333-3333-3333-333333333333', 'estudio');

insert into materias (nombre, carrera_id) values ('Análisis Matemático II', 1), ('Algoritmos', 1);
insert into profile_materias (profile_id, materia_id) values
  ('11111111-1111-1111-1111-111111111111', 1),
  ('22222222-2222-2222-2222-222222222222', 1),
  ('33333333-3333-3333-3333-333333333333', 1);

\echo ''
\echo '=== TEST 1: menor de 18 debe ser rechazado ==='
do $$
begin
  insert into auth.users (id, email) values ('99999999-9999-9999-9999-999999999999','nene@test.com');
  insert into profiles (id, nombre, fecha_nacimiento, genero)
  values ('99999999-9999-9999-9999-999999999999', 'Nene', current_date - interval '15 years', 'otro');
  raise exception 'FALLO: aceptó un menor de 18';
exception when others then
  if sqlerrm like '%mayor de 18%' then
    raise notice 'OK: rechazado (%)', sqlerrm;
  else
    raise;
  end if;
end $$;

\echo ''
\echo '=== TEST 2: like unilateral NO crea match ==='
insert into swipes (emisor_id, receptor_id, direccion, intencion)
values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','like','citas');
select count(*) as matches_esperado_0 from matches;

\echo ''
\echo '=== TEST 3: like reciproco SI crea match ==='
insert into swipes (emisor_id, receptor_id, direccion, intencion)
values ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','like','citas');
select count(*) as matches_esperado_1, min(intencion::text) as intencion from matches;

\echo ''
\echo '=== TEST 4: el par se guarda ordenado (profile_a < profile_b) ==='
select profile_a < profile_b as par_ordenado from matches;

\echo ''
\echo '=== TEST 5: like reciproco en OTRA intencion crea un match separado ==='
insert into swipes (emisor_id, receptor_id, direccion, intencion) values
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','like','estudio'),
  ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','like','estudio');
select count(*) as matches_esperado_2 from matches;

\echo ''
\echo '=== TEST 6: no se puede swipear dos veces la misma persona+intencion ==='
do $$
begin
  insert into swipes (emisor_id, receptor_id, direccion, intencion)
  values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','pass','citas');
  raise exception 'FALLO: permitio swipe duplicado';
exception when unique_violation then
  raise notice 'OK: swipe duplicado rechazado';
end $$;

\echo ''
\echo '=== TEST 7: feed de citas para Caro (busca femenino, Ana busca masculino) ==='
\echo '--- esperado: vacio, la preferencia de genero no es mutua'
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select nombre from get_candidatos('citas', 10);

\echo ''
\echo '=== TEST 8: feed de estudio para Caro ==='
\echo '--- esperado: Ana y Beto, ambos con 1 materia en comun, sin filtro de genero'
select nombre, edad, carrera, materias_en_comun from get_candidatos('estudio', 10);

\echo ''
\echo '=== TEST 9: Ana ya swipeo a Beto en estudio, no debe reaparecer ==='
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select coalesce(string_agg(nombre, ', '), '(vacio)') as feed_ana_estudio
from get_candidatos('estudio', 10);

\echo ''
\echo '=== TEST 10: bloqueo oculta el perfil en las dos direcciones ==='
\echo '--- Caro bloquea a Ana; el feed de Ana no debe traer a Caro'
insert into bloqueos (bloqueador_id, bloqueado_id)
values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111');
select coalesce(string_agg(nombre, ', '), '(vacio)') as feed_ana_tras_bloqueo
from get_candidatos('estudio', 10);

\echo ''
\echo '=== TEST 11: RLS - Ana no puede ver el perfil de Caro que la bloqueo ==='
set role authenticated;
select coalesce(string_agg(nombre, ', '), '(vacio)') as perfiles_visibles_para_ana from profiles;
reset role;

\echo ''
\echo '=== TEST 12: RLS - Ana no ve los swipes que le hicieron a ella ==='
set role authenticated;
select count(*) as swipes_visibles_para_ana from swipes;
\echo '--- (deben ser solo los que ella emitio: 2)'
reset role;

\echo ''
\echo '=== TEST 13: RLS - un tercero no ve los mensajes de un match ajeno ==='
insert into mensajes (match_id, emisor_id, contenido)
select id, '11111111-1111-1111-1111-111111111111', 'hola!' from matches limit 1;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
set role authenticated;
select count(*) as mensajes_visibles_para_caro from mensajes;
reset role;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set role authenticated;
select count(*) as mensajes_visibles_para_ana from mensajes;
reset role;

\echo ''
\echo '=== TEST 14: el receptor NO puede reescribir el contenido ajeno ==='
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
do $$
begin
  update mensajes set contenido = 'texto adulterado';
  raise exception 'FALLO: pudo editar el contenido';
exception when insufficient_privilege then
  raise notice 'OK: UPDATE de contenido denegado por grant de columna';
end $$;
\echo '--- pero SI puede marcarlo como leido:'
update mensajes set leido_at = now();
select case when leido_at is not null then 'OK: marcado como leido' else 'FALLO' end from mensajes;
reset role;

\echo ''
\echo '=== TEST 15: no se puede autoswipear ==='
do $$
begin
  insert into swipes (emisor_id, receptor_id, direccion, intencion)
  values ('11111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','like','citas');
  raise exception 'FALLO: permitio autoswipe';
exception when check_violation then
  raise notice 'OK: autoswipe rechazado';
end $$;

\echo ''
\echo '=== TEST 16: RLS - el bloqueo tambien tapa fotos, intenciones y materias ==='
\echo '--- Caro bloqueo a Ana (test 10); Caro no debe poder leerle fotos/intenciones/materias'
insert into fotos (profile_id, storage_path) values
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111/foto.webp');
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
set role authenticated;
select count(*) as fotos_de_ana_para_caro from fotos where profile_id = '11111111-1111-1111-1111-111111111111';
select count(*) as intenciones_de_ana_para_caro from profile_intenciones where profile_id = '11111111-1111-1111-1111-111111111111';
select count(*) as materias_de_ana_para_caro from profile_materias where profile_id = '11111111-1111-1111-1111-111111111111';
reset role;
\echo '--- (las tres tienen que dar 0)'
\echo '--- pero Beto, sin bloqueo con Ana, si debe poder verlas'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select count(*) as fotos_de_ana_para_beto from fotos where profile_id = '11111111-1111-1111-1111-111111111111';
reset role;
\echo '--- (tiene que dar 1)'
