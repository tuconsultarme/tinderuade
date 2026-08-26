-- UADencuentros — quién me dio like
-- Ejecutar después de 0009.
--
-- Esta función ya existía en el proyecto de Supabase pero nunca había quedado
-- como migración: se creó a mano desde el SQL Editor. Queda registrada acá para
-- que la base se pueda reconstruir de cero desde `schema_completo.sql`.
--
-- Va en SECURITY DEFINER a propósito, y eso contradice a propósito lo que dice
-- 0003: la RLS de `swipes` esconde quién te dio like hasta que haya match. Esta
-- función es la excepción deliberada (la pantalla de "ves quién te dio like").
--
-- Correcciones respecto de la versión que estaba en producción:
--   1. FILTRABA MAL LOS BLOQUEOS: al ser SECURITY DEFINER saltea la RLS de
--      `profiles`, así que quien te bloqueó seguía apareciendo en tu lista de
--      likes recibidos. Ahora se filtra con hay_bloqueo() en las dos
--      direcciones, igual que hace get_candidatos().
--   2. No excluía perfiles dados de baja ni a medio registrar.

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
