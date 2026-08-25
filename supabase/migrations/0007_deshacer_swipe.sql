-- UADencuentros — permite deshacer el último swipe
-- Ejecutar después de 0006.
--
-- 0003_rls.sql decía a propósito "sin UPDATE ni DELETE: un swipe es un
-- hecho, no se edita". Se revisa esa decisión para el botón de "deshacer":
-- el front solo lo ofrece para el swipe que se acaba de hacer y nunca
-- después de que haya armado un match (ver useMazo.ts), pero la política de
-- RLS por sí sola no puede saber "cuál fue el último" — confía en que el
-- cliente solo borre el que corresponde, igual que reordenar_fotos confía en
-- que el cliente mande el conjunto completo de fotos.

create policy "deshacer swipe propio" on swipes
  for delete to authenticated
  using (emisor_id = auth.uid());
