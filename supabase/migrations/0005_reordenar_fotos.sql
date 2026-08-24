-- UADencuentros — reordenar el carrusel de fotos
-- Ejecutar después de 0004.
--
-- Por qué hace falta una función y no alcanza con UPDATEs desde el cliente:
-- `fotos` tiene unique (profile_id, orden) y un CHECK que acota orden a 0..5.
-- Cualquier permutación real pasa por un estado intermedio con dos filas en la
-- misma posición, y desde PostgREST no hay transacción del lado del cliente
-- para diferir la restricción. Acá se hace todo en una sola llamada: se
-- estacionan las filas en un rango libre y después se bajan a su destino.
--
-- El CHECK de orden se relaja a 0..99 para dejar lugar al estacionamiento.
-- Sigue impidiendo valores absurdos y el tope real de 6 fotos lo cuida el
-- trigger `fotos_limite`.

alter table fotos drop constraint if exists fotos_orden_check;
alter table fotos add constraint fotos_orden_check check (orden between 0 and 99);

create or replace function reordenar_fotos(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  i integer;
begin
  if p_ids is null or cardinality(p_ids) = 0 then
    return;
  end if;

  -- Todas las fotos nombradas tienen que ser del usuario que llama. Sin esto,
  -- alguien podría pasar ids ajenos: el UPDATE lo frenaría la RLS, pero es
  -- mejor un error claro que un reordenamiento a medias.
  if exists (
    select 1 from fotos
    where id = any (p_ids) and profile_id <> auth.uid()
  ) then
    raise exception 'Solo se pueden reordenar fotos propias';
  end if;

  if exists (
    select 1 from fotos
    where profile_id = auth.uid()
      and id <> all (p_ids)
  ) then
    raise exception 'Hay que pasar todas las fotos del perfil, no un subconjunto';
  end if;

  -- Paso 1: estacionar fuera del rango de destino para liberar 0..5.
  for i in 1 .. cardinality(p_ids) loop
    update fotos set orden = 89 + i where id = p_ids[i];
  end loop;

  -- Paso 2: bajar cada una a su posición final, en el orden del array.
  for i in 1 .. cardinality(p_ids) loop
    update fotos set orden = i - 1 where id = p_ids[i];
  end loop;
end;
$$;
