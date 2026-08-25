-- UADencuentros — chat con imágenes y respuestas
-- Ejecutar después de 0007.

-- ============================================================
-- 1. Mensajes: imagen y respuesta (cita estilo WhatsApp)
-- ============================================================

-- El contenido deja de ser obligatorio: un mensaje puede ser solo una foto.
alter table mensajes alter column contenido drop not null;

-- El check inline original (contenido entre 1 y 2000) se llamaba
-- mensajes_contenido_check. Se reemplaza por uno que tolera el null.
alter table mensajes drop constraint if exists mensajes_contenido_check;
alter table mensajes drop constraint if exists mensajes_contenido_len;
alter table mensajes
  add constraint mensajes_contenido_len
  check (contenido is null or char_length(contenido) between 1 and 2000);

-- Path de la imagen en el bucket privado fotos-chat (null si es solo texto).
alter table mensajes add column if not exists imagen_path text;

-- A qué mensaje responde. Si el citado se borra, la respuesta queda sin cita.
alter table mensajes add column if not exists responde_a bigint
  references mensajes (id) on delete set null;

-- Un mensaje tiene que tener texto o imagen (o las dos), nunca vacío.
alter table mensajes drop constraint if exists mensajes_tiene_contenido;
alter table mensajes
  add constraint mensajes_tiene_contenido
  check (contenido is not null or imagen_path is not null);

-- Las políticas de insert/select de 0003 siguen valiendo: las columnas nuevas
-- viajan en el mismo insert del emisor, y el grant de update sigue acotado a
-- leido_at, así que nadie puede reescribir la imagen ni la cita de otro.

-- ============================================================
-- 2. Bucket privado de fotos de chat
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-chat',
  'fotos-chat',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Convención de path: {match_id}/{uuid}.webp
-- La primera carpeta es el match, y solo sus participantes pueden subir o ver.
-- Más cerrado que las fotos de perfil (que las ve cualquier logueado): una foto
-- mandada en un chat es privada de esa conversación.

drop policy if exists "subir fotos de chat" on storage.objects;
create policy "subir fotos de chat" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotos-chat'
    and public.es_participante_del_match(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "ver fotos de chat" on storage.objects;
create policy "ver fotos de chat" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fotos-chat'
    and public.es_participante_del_match(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "borrar fotos de chat propias" on storage.objects;
create policy "borrar fotos de chat propias" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'fotos-chat'
    and owner = auth.uid()
  );
