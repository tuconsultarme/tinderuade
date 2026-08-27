-- Tests del cupo diario de likes (migración 0011).

\set QUIET on
\set ON_ERROR_STOP off

insert into auth.users (id, email)
select ('f0000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'cupo-' || g || '@test.com'
from generate_series(1, 40) g;

-- Ana (gratis) y Beto (gold) son quienes swipean. El resto es carne de mazo.
insert into profiles (id, nombre, fecha_nacimiento, genero, carrera_id, onboarding_completo, plan)
select
  ('f0000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
  'P' || g, '2002-01-01', 'femenino', 1, true,
  case when g = 2 then 'gold'::plan_suscripcion else 'gratis'::plan_suscripcion end
from generate_series(1, 40) g;

\set ana '''f0000000-0000-0000-0000-000000000001'''
\set beto '''f0000000-0000-0000-0000-000000000002'''

\set QUIET off

\echo ''
\echo '=== CUPO 1: el plan por defecto es gratis ==='
\echo '--- esperado: gratis'
select plan from profiles where id = :ana;

\echo ''
\echo '=== CUPO 2: arranca con 25 disponibles ==='
set request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000001';
\echo '--- esperado: 0 usados, 25 restantes, ilimitado f'
select * from mi_cupo_de_likes();

\echo ''
\echo '=== CUPO 3: 25 likes entran ==='
insert into swipes (emisor_id, receptor_id, direccion, intencion)
select :ana, ('f0000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'like', 'match'
from generate_series(3, 27) g;
\echo '--- esperado: 25 usados, 0 restantes'
select * from mi_cupo_de_likes();

\echo ''
\echo '=== CUPO 4: el 26 se rechaza ==='
do $$
begin
  insert into swipes (emisor_id, receptor_id, direccion, intencion)
  values ('f0000000-0000-0000-0000-000000000001',
          'f0000000-0000-0000-0000-000000000028', 'like', 'match');
  raise notice 'FALLO: acepto el like 26';
exception when sqlstate 'U0025' then
  raise notice 'OK: rechazado con el codigo propio (%)', sqlerrm;
end $$;

\echo ''
\echo '=== CUPO 5: los PASS siguen siendo libres ==='
insert into swipes (emisor_id, receptor_id, direccion, intencion)
select :ana, ('f0000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'pass', 'match'
from generate_series(28, 35) g;
\echo '--- esperado: 8 pass entraron, y el cupo sigue en 25 usados'
select count(*) as pases from swipes where emisor_id = :ana and direccion = 'pass';
select usados, restantes from mi_cupo_de_likes();

\echo ''
\echo '=== CUPO 6: un plan pago no tiene tope ==='
set request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000002';
insert into swipes (emisor_id, receptor_id, direccion, intencion)
select :beto, ('f0000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'like', 'match'
from generate_series(3, 32) g;
\echo '--- esperado: 30 likes, ilimitado t'
select usados, ilimitado from mi_cupo_de_likes();

\echo ''
\echo '=== CUPO 7: los likes de ayer no cuentan ==='
set request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000001';
update swipes set created_at = now() - interval '2 days' where emisor_id = :ana;
\echo '--- esperado: 0 usados, 25 restantes otra vez'
select usados, restantes from mi_cupo_de_likes();
\echo '--- y ahora vuelve a poder dar like'
do $$
begin
  insert into swipes (emisor_id, receptor_id, direccion, intencion)
  values ('f0000000-0000-0000-0000-000000000001',
          'f0000000-0000-0000-0000-000000000036', 'like', 'match');
  raise notice 'OK: acepto el like tras el reinicio';
exception when others then
  raise notice 'FALLO: lo rechazo (%)', sqlerrm;
end $$;
