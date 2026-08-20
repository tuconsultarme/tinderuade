# Base de datos — UADencuentros

## Pasos para levantarla

1. Entrar a [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
   - Nombre: `uadencuentros`
   - Región: **South America (São Paulo)** — es la más cercana, importa para la latencia del chat
   - Guardar la contraseña de la base en un lugar seguro (no se vuelve a mostrar)

2. En el proyecto nuevo, ir a **SQL Editor** y ejecutar en este orden:

   | Orden | Archivo | Qué hace |
   |-------|---------|----------|
   | 1 | `migrations/0001_schema_inicial.sql` | Tipos, catálogos, perfiles, swipes, matches, mensajes, moderación |
   | 2 | `migrations/0002_funciones.sql` | Triggers de validación, creación automática de match, función del feed |
   | 3 | `migrations/0003_rls.sql` | Row Level Security en todas las tablas + Realtime del chat |
   | 4 | `migrations/0004_storage.sql` | Bucket privado de fotos y sus políticas |
   | 5 | `seed.sql` | Sedes y carreras de UADE |

3. En **Project Settings → API**, copiar y guardar:
   - Project URL
   - `anon` public key
   - `service_role` key — **nunca** va al cliente ni al repo

## Decisiones tomadas

- **Registro con email libre.** Cualquiera puede crear cuenta y declara su carrera y sede. Sin restricción por dominio `@uade.edu.ar`, así que no hay garantía de que quien se registra sea de la facultad. El schema está preparado para agregar esa restricción después sin migrar datos.
- **Tres intenciones**: `citas`, `amistad`, `estudio`. Un perfil elige una o varias y solo se cruza con gente que comparte al menos una. El swipe es **por intención**: podés querer a alguien de compañero de TP y no de cita, y son dos decisiones distintas.
- **Chat interno** sobre Supabase Realtime. El match *es* la conversación: no hay tabla de conversaciones separada.
- **Bucket de fotos privado**, servido con signed URLs. Un bucket público deja las fotos accesibles con el link para siempre, sin login y sin poder revocarlas.

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
