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
   | 11 | `migrations/0011_arreglar_enum_intencion.sql` | Restaura el enum `intencion` a `citas`/`amistad`/`estudio`. **La 0014 lo vuelve a dejar en dos valores**: se conserva sólo para que una base vieja llegue al mismo estado |
   | 12 | `migrations/0012_edad_minima_17.sql` | Baja la edad mínima de registro a 17 |
   | 13 | `migrations/0013_planes.sql` | Columna `profiles.plan` (`gratis`/`plus`/`gold`) |
   | 14 | `migrations/0014_dos_intenciones.sql` | De tres intenciones a dos: `match` (distinto género) y `estudio` (misma carrera) |
   | 15 | `migrations/0015_mis_likes_recibidos.sql` | Versión final de "quién me dio like": suma el filtro de bloqueos y el `grant` que faltaban |
   | 16 | `migrations/0016_cupo_de_likes.sql` | Límite diario de likes del plan gratis, aplicado por trigger en la base |
   | 17 | `seed.sql` | Sedes y carreras de UADE |

   > **Si la base viene de antes:** aplicá las que te falten, en orden. El orden
   > importa: la `0011` y la `0014` tocan las dos el enum `intencion` y se
   > pisan si se corren al revés.
   >
   > **Por qué la `0011` y la `0014` se contradicen.** Se escribieron en
   > paralelo, sin que una rama supiera de la otra. La `0014` pasa el producto
   > a dos lentes (`match`, `estudio`); la `0011` leyó ese cambio como un
   > accidente hecho a mano desde el dashboard y lo revirtió. La decisión de
   > producto es **dos lentes**, así que la `0014` va después y es la que manda.
   > Las dos quedan en el repo para que una base que ya aplicó la `0011`
   > termine en el mismo estado que una creada de cero.
   >
   > La `0014` **borra datos**: los matches de la vieja intención `amistad` y
   > sus conversaciones se van. También renombra `citas` a `match`.
   >
   > La `0015` corrige un bug de privacidad: la versión de la `0010` mostraba
   > en "quién me dio like" a gente que te había bloqueado, porque al ser
   > `SECURITY DEFINER` saltea la RLS de `profiles`.
   >
   > Sin la `0005`, "hacer principal" y borrar fotos del perfil fallan. Sin la
   > `0006`, alguien que te bloqueó puede seguir viendo tus fotos pidiéndolas
   > por API directo. Sin la `0007`, el botón de "deshacer" del mazo tira
   > error. Sin la `0008`, el chat no acepta fotos ni respuestas citadas. Sin
   > la `0009` y la `0010`, "Perfiles bloqueados" y "Matches recibidos" no
   > muestran nombres o tiran error. Sin la `0016`, el cupo diario de likes no
   > se aplica y el plan gratis queda ilimitado.

3. En **Project Settings → API**, copiar y guardar:
   - Project URL
   - `anon` public key
   - `service_role` key — **nunca** va al cliente ni al repo

## Decisiones tomadas

- **Registro con email libre.** Cualquiera puede crear cuenta y declara su carrera y sede. Sin restricción por dominio `@uade.edu.ar`, así que no hay garantía de que quien se registra sea de la facultad. El schema está preparado para agregar esa restricción después sin migrar datos.
- **Dos intenciones**: `match` (gente que no es de tu mismo género) y `estudio` (gente de tu misma carrera). Un perfil elige una o las dos y solo se cruza con gente que comparte al menos una. El swipe es **por intención**: podés querer a alguien de compañero de TP y no de cita, y son dos decisiones distintas. Antes eran tres (`citas`, `amistad`, `estudio`); se redujo en la `0014`.
- **Chat interno** sobre Supabase Realtime. El match *es* la conversación: no hay tabla de conversaciones separada.
- **Bucket de fotos privado**, servido con signed URLs. Un bucket público deja las fotos accesibles con el link para siempre, sin login y sin poder revocarlas.

## Tests

28 tests contra PostgreSQL 16 local, con stubs que imitan lo que aporta Supabase
(`auth.uid()`, `auth.users`, `storage.objects`, la publicación de Realtime).

- `tests/test_logica.sql` (17): mayoría de edad, creación de match recíproco,
  separación por intención, swipes duplicados, filtro de género mutuo, bloqueo
  bidireccional y siete casos de RLS.
- `tests/test_fotos.sql` (6): reordenamiento del carrusel, rechazo de fotos
  ajenas, rechazo de subconjuntos y tope de 6 fotos.
- `tests/test_dos_intenciones.sql` (7): que `match` no muestre tu mismo género,
  que `estudio` exija misma carrera, y que el enum viejo ya no se acepte.
- `tests/test_likes_recibidos.sql` (5): quién te dio like, que desaparezca al
  responderle, y que los bloqueos lo filtren en las dos direcciones.

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
  -f tests/test_fotos.sql \
  -f tests/test_dos_intenciones.sql \
  -f tests/test_likes_recibidos.sql

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
