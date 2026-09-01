-- UADencuentros — quién me dio like
-- Ejecutar después de 0014.
--
-- Va en SECURITY DEFINER a propósito, y eso contradice a propósito lo que dice
-- 0003: la RLS de `swipes` esconde quién te dio like hasta que haya match. Esta
-- función es la excepción deliberada (la pantalla de "ves quién te dio like").
-- Solo devuelve los likes dirigidos al propio usuario que todavía no respondió:
-- nunca expone likes de terceros entre sí.
--
-- ------------------------------------------------------------------
-- ESTA VERSIÓN UNIFICA DOS QUE SE ESCRIBIERON EN PARALELO
-- ------------------------------------------------------------------
-- La función se definió dos veces sin que una rama supiera de la otra: en la
-- 0010 (`likes_recibidos`) y en la que era 0010 de la otra rama
-- (`mis_likes_recibidos`). Ninguna de las dos estaba completa:
--
--   - A la de 0010 le faltaban los filtros de visibilidad: al ser SECURITY
--     DEFINER saltea la RLS de `profiles`, así que quien te bloqueó seguía
--     apareciendo en tu lista de likes recibidos, igual que los perfiles dados
--     de baja o a medio registrar.
--   - A la otra le faltaba el `grant execute`, sin el cual el cliente recibe
--     "permission denied for function".
--
-- Acá van las dos cosas. Se ejecuta después de 0014 a propósito: esa migración
-- recrea el tipo `intencion`, y al hacerlo vuelve a crear esta función tal como
-- estaba antes (guarda y restaura las funciones que referencian el tipo). Este
-- CREATE OR REPLACE la deja después en su forma definitiva.

create or replace function mis_likes_recibidos()
returns table (
  emisor_id uuid,
  nombre text,
  intencion intencion,
  recibido_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.emisor_id, p.nombre, s.intencion, s.created_at
  from swipes s
  join profiles p on p.id = s.emisor_id
  where s.receptor_id = auth.uid()
    and s.direccion = 'like'
    -- todavía no le respondí
    and not exists (
      select 1 from swipes mio
      where mio.emisor_id = auth.uid()
        and mio.receptor_id = s.emisor_id
        and mio.intencion = s.intencion
    )
    -- que siga siendo alguien visible
    and p.activo
    and p.onboarding_completo
    -- y que no haya bloqueo en ninguna de las dos direcciones
    and not hay_bloqueo(p.id)
  order by s.created_at desc
$$;

grant execute on function mis_likes_recibidos() to authenticated;
