-- UADencuentros — bucket de fotos de perfil
-- Ejecutar después de 0003.

-- Bucket privado: las fotos se sirven con signed URLs, no con URL pública.
-- Un bucket público significa que cualquiera con el link ve la foto para
-- siempre, sin login y sin poder revocarla.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-perfil',
  'fotos-perfil',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Convención de path: {user_id}/{uuid}.{ext}
-- La primera carpeta es el id del dueño, y eso es lo que se valida.

create policy "subir fotos propias" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotos-perfil'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "borrar fotos propias" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'fotos-perfil'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "actualizar fotos propias" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'fotos-perfil'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Cualquier usuario logueado puede leer, para poder generar la signed URL de
-- las fotos que aparecen en el feed.
create policy "ver fotos de perfil" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos-perfil');
