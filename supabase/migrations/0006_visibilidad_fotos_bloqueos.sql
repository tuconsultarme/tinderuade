-- UADencuentros — cierra el bypass de bloqueos en fotos, intenciones y materias
-- Ejecutar después de 0005.
--
-- "perfiles visibles" (0003_rls.sql) ya exige activo + onboarding_completo +
-- sin bloqueo mutuo para ver el perfil de otra persona. Pero `fotos`,
-- `profile_intenciones` y `profile_materias` tenían políticas de SELECT que
-- no replicaban esa condición:
--   - "fotos visibles" comprobaba `exists (select 1 from profiles p where
--     p.id = fotos.profile_id)`, que por la FK de `fotos.profile_id` da
--     siempre true — en la práctica era "cualquiera ve las fotos de
--     cualquiera".
--   - "intenciones visibles" y "materias de perfil visibles" eran
--     directamente `using (true)`.
--   - La política de storage "ver fotos de perfil" solo miraba
--     `bucket_id = 'fotos-perfil'`, sin ninguna relación con quién bloqueó a
--     quién.
--
-- En la UI esto no se notaba porque el mazo, matches y "ver perfil completo"
-- siempre pasan por `get_candidatos()` o por la política de `profiles`, que sí
-- filtran bloqueos. Pero golpeando la API REST de Supabase directo (o el
-- endpoint de storage) se podían pedir fotos, intenciones o materias de
-- alguien que te bloqueó, o de un perfil inactivo o sin onboarding. El
-- bloqueo tiene que valer a nivel de datos, no solo en las pantallas que arma
-- el front.

create or replace function perfil_visible_para_mi(p_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_profile_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = p_profile_id
        and p.activo
        and p.onboarding_completo
        and not hay_bloqueo(p.id)
    );
$$;

drop policy "fotos visibles" on fotos;
create policy "fotos visibles" on fotos
  for select to authenticated
  using (perfil_visible_para_mi(fotos.profile_id));

drop policy "intenciones visibles" on profile_intenciones;
create policy "intenciones visibles" on profile_intenciones
  for select to authenticated
  using (perfil_visible_para_mi(profile_intenciones.profile_id));

drop policy "materias de perfil visibles" on profile_materias;
create policy "materias de perfil visibles" on profile_materias
  for select to authenticated
  using (perfil_visible_para_mi(profile_materias.profile_id));

-- El path de cada objeto es {profile_id}/{archivo}; la política de insert ya
-- asume ese formato (0004_storage.sql), así que el cast a uuid es seguro acá
-- también.
drop policy "ver fotos de perfil" on storage.objects;
create policy "ver fotos de perfil" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fotos-perfil'
    and perfil_visible_para_mi(((storage.foldername(name))[1])::uuid)
  );
