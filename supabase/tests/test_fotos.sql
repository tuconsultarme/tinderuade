-- Tests de reordenamiento de fotos (migración 0005).
-- Correr después de stub + 0001..0005.
--
-- Usa ids y mails propios (prefijo "fotos-") para poder correr sobre la misma
-- base que test_logica.sql sin chocar con sus usuarios.

\set QUIET on
\set ON_ERROR_STOP off

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fotos-ana@test.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'fotos-beto@test.com');

insert into profiles (id, nombre, fecha_nacimiento, genero, onboarding_completo)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ana F', '2002-03-01', 'femenino', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Beto F', '2001-05-10', 'masculino', true);

insert into fotos (id, profile_id, storage_path, orden) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a/1.webp', 0),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a/2.webp', 1),
  ('11111111-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a/3.webp', 2);

insert into fotos (id, profile_id, storage_path, orden) values
  ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b/1.webp', 0);

set request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

\set QUIET off

\echo ''
\echo '=== FOTOS 1: invertir el orden completo (3,2,1) ==='
select reordenar_fotos(array[
  '11111111-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000001'
]::uuid[]);
\echo '--- esperado: 3.webp=0, 2.webp=1, 1.webp=2'
select storage_path, orden from fotos
where profile_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' order by orden;

\echo ''
\echo '=== FOTOS 2: mover la ultima a principal (rotacion) ==='
select reordenar_fotos(array[
  '11111111-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000002'
]::uuid[]);
\echo '--- esperado: 1.webp=0, 3.webp=1, 2.webp=2'
select storage_path, orden from fotos
where profile_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' order by orden;

\echo ''
\echo '=== FOTOS 3: no se puede reordenar fotos ajenas ==='
do $$
begin
  perform reordenar_fotos(array['22222222-0000-0000-0000-000000000001']::uuid[]);
  raise notice 'FALLO: dejo tocar una foto ajena';
exception when others then
  raise notice 'OK: rechazado (%)', sqlerrm;
end $$;

\echo ''
\echo '=== FOTOS 4: no se acepta un subconjunto ==='
do $$
begin
  perform reordenar_fotos(array['11111111-0000-0000-0000-000000000001']::uuid[]);
  raise notice 'FALLO: acepto un subconjunto';
exception when others then
  raise notice 'OK: rechazado (%)', sqlerrm;
end $$;

\echo ''
\echo '=== FOTOS 5: el orden quedo intacto tras los rechazos ==='
\echo '--- esperado: 1.webp=0, 3.webp=1, 2.webp=2'
select storage_path, orden from fotos
where profile_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' order by orden;

\echo ''
\echo '=== FOTOS 6: sigue rigiendo el tope de 6 fotos ==='
insert into fotos (profile_id, storage_path, orden) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a/4.webp', 3),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a/5.webp', 4),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a/6.webp', 5);
do $$
begin
  insert into fotos (profile_id, storage_path, orden)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a/7.webp', 6);
  raise notice 'FALLO: acepto una septima foto';
exception when others then
  raise notice 'OK: rechazado (%)', sqlerrm;
end $$;
