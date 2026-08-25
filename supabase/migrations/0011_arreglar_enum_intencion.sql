-- UADencuentros — restaura el enum intencion (citas/amistad/estudio)
-- Ejecutar después de 0010.
--
-- En algún momento se editó el tipo `intencion` a mano desde el dashboard de
-- Supabase (Database → Enumerated Types) en vez de por migración: quedó con
-- los valores `match` y `estudio` en vez de `citas`, `amistad` y `estudio`.
-- Probablemente un rename de "citas" a "match" pensando en el look estilo
-- Tinder, que de paso se llevó puesto "amistad".
--
-- Resultado: el mazo en modo citas/amistad no cargaba ("invalid input value
-- for enum intencion"), y los swipes/matches/intenciones de perfil que
-- deberían decir "citas" o "amistad" quedaron con la etiqueta ambigua
-- "match" — no hay forma de saber cuál era cuál.
--
-- Como todo lo que hay cargado hasta ahora son perfiles y swipes de prueba
-- (el seed de scripts/seed-demo.mjs y pruebas manuales, nada de gente real
-- todavía), se limpia esa data ambigua en vez de adivinar, y se puede volver
-- a correr el seed después. La etiqueta "match" queda en el tipo sin uso: no
-- vale la pena el riesgo de recrear el tipo (y con él las funciones que lo
-- referencian) solo para sacarla, ya que el front nunca la va a volver a
-- generar.

-- 1. Restaurar los valores que faltan. ADD VALUE es aditivo: no toca las
--    filas existentes.
alter type intencion add value if not exists 'citas';
alter type intencion add value if not exists 'amistad';

-- 2. Limpiar la data ambigua. Comparar como texto (intencion::text) y no
--    contra el literal 'match' directo: en una base nueva (o ya arreglada)
--    'match' nunca fue ni va a ser un valor válido del enum, así que
--    Postgres rechazaría el literal antes de llegar a evaluar el WHERE.
--    Como texto, si no hay ninguna fila así, el DELETE no borra nada y no
--    rompe nada — que es exactamente lo que tiene que pasar en una base sana.
--
--    `matches` se borra antes que `swipes` nomás por orden de lectura: no hay
--    FK entre ellas que lo exija, y el `on delete cascade` de
--    mensajes(match_id) se encarga de los mensajes de esos matches solo.
delete from matches where intencion::text = 'match';
delete from swipes where intencion::text = 'match';
delete from profile_intenciones where intencion::text = 'match';
