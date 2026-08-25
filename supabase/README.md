# Base de datos — UADencuentros

## Pasos para levantarla

1. Entrar a [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
   - Nombre: `uadencuentros`
   - Región: **South America (São Paulo)** — es la más cercana, importa para la latencia del chat
   - Guardar la contraseña de la base en un lugar seguro (no se vuelve a mostrar)

2. En el proyecto nuevo, ir a **SQL Editor** y pegar `schema_completo.sql` entero (es la concatenación de todo lo de abajo, en orden). Si preferís ir por partes, ejecutar en este orden:

   | Orden | Archivo | Qué hace |
   |-------|---------|----------|
   | 1 | `migrations/0001_schema_inicial.sql` | Tipos, catálogos, perfiles, swipes, matches, mensajes, moderación |
   | 2 | `migrations/0002_funciones.sql` | Triggers de validación, creación automática de match, función del feed |
   | 3 | `migrations/0003_rls.sql` | Row Level Security en todas las tablas + Realtime del chat |
   | 4 | `migrations/0004_storage.sql` | Bucket privado de fotos y sus políticas |
   | 5 | `migrations/0005_reordenar_fotos.sql` | Función para reordenar el carrusel de fotos |
   | 6 | `migrations/0006_visibilidad_fotos_bloqueos.sql` | Cierra un bypass: fotos, intenciones y materias ahora respetan bloqueos y perfiles inactivos, igual que ya hacía `profiles` |
   | 7 | `migrations/0007_deshacer_swipe.sql` | Permite borrar el propio swipe, para el botón de "deshacer" del mazo |
   | 8 | `migrations/0008_chat_rico.sql` | Fotos y respuestas citadas en el chat, bucket privado `fotos-chat` |
   | 9 | `migrations/0009_bloqueados_con_nombre.sql` | Función para listar los propios bloqueados con nombre |
   | 10 | `migrations/0010_likes_recibidos.sql` | Función para ver quién te dio like y todavía no respondiste |
   | 11 | `migrations/0011_arreglar_enum_intencion.sql` | Restaura el enum `intencion` (`citas`/`amistad`/`estudio`) si quedó editado a mano desde el dashboard, y limpia la data ambigua que eso deja |
   | 12 | `seed.sql` | Sedes y carreras de UADE |

   > **Si la base ya estaba creada antes del front:** faltan la `0005` en
   > adelante. Pegá esos archivos en el SQL Editor, en orden. Sin la `0005`,
   > "hacer principal" y borrar fotos del perfil fallan. Sin la `0006`,
   > alguien que te bloqueó puede seguir viendo tus fotos pidiéndolas por API
   > directo. Sin la `0007`, el botón de "deshacer" del mazo tira error. Sin
   > la `0008`, el chat no acepta fotos ni respuestas citadas. Sin la `0009`
   > y la `0010`, "Perfiles bloqueados" y "Matches recibidos" no muestran
   > nombres o tiran error. La `0011` solo hace falta si en algún momento se
   > tocó el tipo `intencion` a mano desde el dashboard en vez de por
   > migración (pasó una vez, ver el comentario del archivo) — correrla de
   > más no rompe nada, es segura de ejecutar aunque el enum esté sano.

3. En **Project Settings → API**, copiar y guardar:
   - Project URL
   - `anon` public key
   - `service_role` key — **nunca** va al cliente ni al repo

## Decisiones tomadas

- **Registro con email libre.** Cualquiera puede crear cuenta y declara su carrera y sede. Sin restricción por dominio `@uade.edu.ar`, así que no hay garantía de que quien se registra sea de la facultad. El schema está preparado para agregar esa restricción después sin migrar datos.
- **Tres intenciones**: `citas`, `amistad`, `estudio`. Un perfil elige una o varias y solo se cruza con gente que comparte al menos una. El swipe es **por intención**: podés querer a alguien de compañero de TP y no de cita, y son dos decisiones distintas.
- **Chat interno** sobre Supabase Realtime. El match *es* la conversación: no hay tabla de conversaciones separada.
- **Bucket de fotos privado**, servido con signed URLs. Un bucket público deja las fotos accesibles con el link para siempre, sin login y sin poder revocarlas.

## Tests

23 tests contra PostgreSQL 16 local, con stubs que imitan lo que aporta Supabase
(`auth.uid()`, `auth.users`, `storage.objects`, la publicación de Realtime).

- `tests/test_logica.sql` (17): mayoría de edad, creación de match recíproco,
  separación por intención, swipes duplicados, filtro de género mutuo, bloqueo
  bidireccional y siete casos de RLS.
- `tests/test_fotos.sql` (6): reordenamiento del carrusel, rechazo de fotos
  ajenas, rechazo de subconjuntos y tope de 6 fotos.

Se corren sobre `schema_completo.sql`, así que además verifican que el archivo
que se pega en el SQL Editor esté bien armado.

```bash
brew install postgresql@16
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# levantar un postgres descartable
initdb -D /tmp/uadepg -U postgres --locale=C -E UTF8
pg_ctl -D /tmp/uadepg -o "-p 55433 -c unix_socket_directories= -c listen_addresses=127.0.0.1" -l /tmp/uadepg.log start

# correr todo
psql -h 127.0.0.1 -p 55433 -U postgres -c "create database uadetest;"
psql -h 127.0.0.1 -p 55433 -U postgres -d uadetest -v ON_ERROR_STOP=1 \
  -f tests/stub_supabase.sql \
  -f schema_completo.sql
psql -h 127.0.0.1 -p 55433 -U postgres -d uadetest \
  -f tests/test_logica.sql \
  -f tests/test_fotos.sql

pg_ctl -D /tmp/uadepg stop
```

Los `\echo` van comparados a ojo contra el "esperado" de cada caso; los que
validan un rechazo imprimen `OK:` o `FALLO:`. No debería aparecer ningún
`ERROR` en la salida.

Los stubs son solo para el test: en Supabase esos objetos ya existen y no hay
que crearlos.

## Cosas a definir antes de programar

- El listado de carreras y sedes en `seed.sql` lo armé de memoria — hay que verificarlo contra la web de UADE.
- Las materias quedaron sin cargar hasta que definamos bien el flujo de "compañero de estudio".
- No hay panel de moderación: los reportes se guardan pero hoy solo se leen desde el dashboard.
- Falta decidir si el chat necesita filtro de contenido o límite de mensajes por día.

## Modelo

```
auth.users
    └── profiles ──┬── profile_intenciones  (citas / amistad / estudio)
                   ├── profile_materias ──── materias ── carreras
                   ├── fotos                              │
                   ├── carrera_id ────────────────────────┘
                   └── sede_id ───────────── sedes

profiles ──> swipes ──(like recíproco, mismo intent)──> matches ──> mensajes
         └─> bloqueos
         └─> reportes
```
