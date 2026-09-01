-- UADencuentros — listar los perfiles bloqueados con su nombre
-- Ejecutar después de 0008.

-- La política "perfiles visibles" (0003) oculta con hay_bloqueo() a cualquiera
-- que uno haya bloqueado, así que desde el cliente no se puede leer el nombre
-- de un bloqueado. Esta función corre como security definer para poder unir con
-- profiles igual, pero solo devuelve los bloqueos del propio usuario: nunca
-- expone datos de terceros.
create or replace function mis_bloqueados()
returns table (id uuid, nombre text, bloqueado_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.nombre, b.created_at
  from bloqueos b
  join profiles p on p.id = b.bloqueado_id
  where b.bloqueador_id = auth.uid()
  order by b.created_at desc
$$;

grant execute on function mis_bloqueados() to authenticated;
