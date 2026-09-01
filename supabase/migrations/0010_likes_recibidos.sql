-- UADencuentros — ver los likes recibidos (para devolver o rechazar)
-- Ejecutar después de 0009.

-- La RLS de swipes solo deja ver los propios (emisor = auth.uid()), así que
-- desde el cliente no se puede saber quién te dio like. Esta función lo
-- resuelve como security definer, pero solo devuelve los likes dirigidos al
-- propio usuario que todavía no respondió (ni like ni pass en esa intención):
-- nunca expone likes de terceros entre sí.
create or replace function mis_likes_recibidos()
returns table (emisor_id uuid, nombre text, intencion intencion, recibido_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select s.emisor_id, p.nombre, s.intencion, s.created_at
  from swipes s
  join profiles p on p.id = s.emisor_id
  where s.receptor_id = auth.uid()
    and s.direccion = 'like'
    and not exists (
      select 1 from swipes mio
      where mio.emisor_id = auth.uid()
        and mio.receptor_id = s.emisor_id
        and mio.intencion = s.intencion
    )
  order by s.created_at desc
$$;

grant execute on function mis_likes_recibidos() to authenticated;
