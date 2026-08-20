-- UADencuentros — Row Level Security
-- Ejecutar después de 0002.
--
-- Regla general: nadie escribe filas de otro. Los catálogos son de solo lectura
-- desde el cliente y se cargan con la service_role key.

-- ============================================================
-- 1. Catálogos: lectura pública para usuarios logueados
-- ============================================================

alter table sedes enable row level security;
alter table carreras enable row level security;
alter table materias enable row level security;

create policy "sedes visibles" on sedes
  for select to authenticated using (activa);

create policy "carreras visibles" on carreras
  for select to authenticated using (activa);

create policy "materias visibles" on materias
  for select to authenticated using (activa);

-- ============================================================
-- 2. Perfiles
-- ============================================================

alter table profiles enable row level security;

-- Cualquier usuario logueado ve los perfiles activos, salvo los que lo
-- bloquearon o bloqueó. El propio perfil siempre es visible para su dueño
-- (incluso a medio completar).
create policy "perfiles visibles" on profiles
  for select to authenticated
  using (
    id = auth.uid()
    or (
      activo
      and onboarding_completo
      and not hay_bloqueo(profiles.id)
    )
  );

create policy "crear perfil propio" on profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "editar perfil propio" on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "borrar perfil propio" on profiles
  for delete to authenticated
  using (id = auth.uid());

-- ============================================================
-- 3. Intenciones y materias del perfil
-- ============================================================

alter table profile_intenciones enable row level security;
alter table profile_materias enable row level security;

create policy "intenciones visibles" on profile_intenciones
  for select to authenticated using (true);

create policy "gestionar intenciones propias" on profile_intenciones
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "materias de perfil visibles" on profile_materias
  for select to authenticated using (true);

create policy "gestionar materias propias" on profile_materias
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ============================================================
-- 4. Fotos
-- ============================================================

alter table fotos enable row level security;

create policy "fotos visibles" on fotos
  for select to authenticated
  using (
    exists (select 1 from profiles p where p.id = fotos.profile_id)
  );

create policy "gestionar fotos propias" on fotos
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ============================================================
-- 5. Swipes
-- ============================================================
-- Un swipe solo lo ve quien lo emitió: el receptor no debe poder consultar
-- quién le dio like antes de que haya match.

alter table swipes enable row level security;

create policy "ver swipes propios" on swipes
  for select to authenticated
  using (emisor_id = auth.uid());

create policy "emitir swipes propios" on swipes
  for insert to authenticated
  with check (emisor_id = auth.uid());

-- Sin UPDATE ni DELETE a propósito: un swipe es un hecho, no se edita.

-- ============================================================
-- 6. Matches
-- ============================================================

alter table matches enable row level security;

create policy "ver matches propios" on matches
  for select to authenticated
  using (auth.uid() in (profile_a, profile_b));

-- Los matches los crea el trigger (SECURITY DEFINER), no el cliente.
-- Lo único que puede hacer el usuario es desactivar el suyo (unmatch).
create policy "desactivar match propio" on matches
  for update to authenticated
  using (auth.uid() in (profile_a, profile_b))
  with check (auth.uid() in (profile_a, profile_b));

-- ============================================================
-- 7. Mensajes
-- ============================================================

alter table mensajes enable row level security;

create policy "ver mensajes del match" on mensajes
  for select to authenticated
  using (es_participante_del_match(match_id));

create policy "enviar mensajes al match" on mensajes
  for insert to authenticated
  with check (
    emisor_id = auth.uid()
    and es_participante_del_match(match_id)
  );

-- Marcar como leído. La política sola no alcanza: un UPDATE permitido puede
-- tocar cualquier columna, así que el receptor podría reescribir el contenido
-- del mensaje que le mandaron. El grant por columna es lo que lo impide.
create policy "marcar leido" on mensajes
  for update to authenticated
  using (es_participante_del_match(match_id) and emisor_id <> auth.uid())
  with check (es_participante_del_match(match_id));

revoke update on mensajes from authenticated;
grant update (leido_at) on mensajes to authenticated;

-- ============================================================
-- 8. Moderación
-- ============================================================

alter table bloqueos enable row level security;
alter table reportes enable row level security;

create policy "gestionar bloqueos propios" on bloqueos
  for all to authenticated
  using (bloqueador_id = auth.uid())
  with check (bloqueador_id = auth.uid());

create policy "crear reporte propio" on reportes
  for insert to authenticated
  with check (reportante_id = auth.uid());

create policy "ver reportes propios" on reportes
  for select to authenticated
  using (reportante_id = auth.uid());

-- ============================================================
-- 9. Realtime para el chat
-- ============================================================
-- La RLS de mensajes también aplica al canal de Realtime.

alter publication supabase_realtime add table mensajes;
alter publication supabase_realtime add table matches;
