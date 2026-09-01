-- UADencuentros — límite diario de likes del plan gratuito
-- Ejecutar después de 0015.
--
-- El plan gratuito puede dar 25 likes por día. Los "pass" no consumen nada:
-- si descartar costara cupo, la gente dejaría de mirar perfiles.
--
-- El límite se aplica con un TRIGGER y no solo en la interfaz. La RLS deja que
-- cualquiera inserte sus propios swipes, así que un control en el cliente se
-- saltea llamando a la API directo. La base es el único lugar donde el límite
-- es real.

begin;

-- ============================================================
-- 1. El plan de cada perfil lo define 0013
-- ============================================================
-- Esta migración se escribió en paralelo a 0013 y también agregaba
-- `profiles.plan`, pero como un enum `plan_suscripcion` en vez de un `text`
-- con CHECK. Se quedó la de 0013, que es la que ya está aplicada y la que lee
-- el front (`src/lib/planes.ts`). Acá solo se consume la columna.
--
-- Los valores son los mismos ('gratis', 'plus', 'gold'), así que las
-- comparaciones de más abajo (`plan = 'gratis'`) funcionan igual contra text.
-- El CHECK de 0013 cubre lo que cubría el enum: un typo no puede dejar a
-- alguien con un plan inexistente que caiga en el caso "no gratis" y le dé
-- likes ilimitados.

-- ============================================================
-- 2. Cuánto queda
-- ============================================================

create or replace function limite_likes_diario()
returns integer
language sql
immutable
as $$ select 25 $$;

comment on function limite_likes_diario() is
  'Likes por día del plan gratuito. Cambiar acá cambia el tope en todos lados.';

-- El día arranca a la medianoche de Buenos Aires, no a la UTC: si no, el cupo
-- se reiniciaría a las 21 hs local, que no es lo que espera nadie.
create or replace function inicio_del_dia_local()
returns timestamptz
language sql
stable
as $$
  select date_trunc('day', now() at time zone 'America/Argentina/Buenos_Aires')
         at time zone 'America/Argentina/Buenos_Aires'
$$;

create or replace function likes_dados_hoy(p_perfil uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from swipes
  where emisor_id = p_perfil
    and direccion = 'like'
    and created_at >= inicio_del_dia_local()
$$;

/**
 * Lo que consulta la app para mostrar el contador.
 * `ilimitado` es true para los planes pagos; ahí `restantes` no significa nada.
 */
create or replace function mi_cupo_de_likes()
returns table (usados integer, restantes integer, ilimitado boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    likes_dados_hoy(auth.uid()) as usados,
    greatest(0, limite_likes_diario() - likes_dados_hoy(auth.uid())) as restantes,
    (select plan <> 'gratis' from profiles where id = auth.uid()) as ilimitado
$$;

-- ============================================================
-- 3. El tope, aplicado
-- ============================================================
-- SQLSTATE propio para que el front distinga "te quedaste sin likes" de
-- cualquier otro error de inserción y muestre la pantalla de planes.

create or replace function validar_cupo_de_likes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  es_gratis boolean;
  usados integer;
begin
  if new.direccion <> 'like' then
    return new;
  end if;

  select plan = 'gratis' into es_gratis from profiles where id = new.emisor_id;
  if not coalesce(es_gratis, true) then
    return new;
  end if;

  usados := likes_dados_hoy(new.emisor_id);
  if usados >= limite_likes_diario() then
    raise exception 'Te quedaste sin likes por hoy (% de %)', usados, limite_likes_diario()
      using errcode = 'U0025';
  end if;

  return new;
end;
$$;

drop trigger if exists swipes_cupo_de_likes on swipes;

-- BEFORE INSERT y antes que el trigger de match: si no hay cupo, no se crea
-- el swipe y por lo tanto tampoco puede armarse el match.
create trigger swipes_cupo_de_likes
  before insert on swipes
  for each row
  execute function validar_cupo_de_likes();

commit;
