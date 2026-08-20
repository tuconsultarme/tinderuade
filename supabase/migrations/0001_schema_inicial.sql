-- UADencuentros — schema inicial
-- Ejecutar en el SQL Editor de Supabase, en orden (0001 → 0002 → 0003 → seed).

-- ============================================================
-- 1. Tipos
-- ============================================================

create type genero as enum ('masculino', 'femenino', 'no_binario', 'otro');

-- Las tres intenciones definidas para la app. Un perfil puede tener varias.
create type intencion as enum ('citas', 'amistad', 'estudio');

create type direccion_swipe as enum ('like', 'pass');

create type estado_reporte as enum ('pendiente', 'revisado', 'accionado', 'desestimado');

-- ============================================================
-- 2. Catálogos
-- ============================================================
-- Van como tablas y no como enums: las carreras y materias cambian por
-- cuatrimestre y un ALTER TYPE en producción es mucho más molesto que un INSERT.

create table sedes (
  id smallint generated always as identity primary key,
  nombre text not null unique,
  activa boolean not null default true
);

create table carreras (
  id smallint generated always as identity primary key,
  nombre text not null unique,
  facultad text not null,
  activa boolean not null default true
);

create table materias (
  id integer generated always as identity primary key,
  codigo text unique,
  nombre text not null,
  carrera_id smallint references carreras (id) on delete set null,
  activa boolean not null default true
);

create index materias_carrera_idx on materias (carrera_id) where activa;

-- ============================================================
-- 3. Perfiles
-- ============================================================

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 2 and 50),
  fecha_nacimiento date not null,
  genero genero not null,
  -- A qué géneros quiere ver en el feed. Vacío = sin preferencia.
  busca_generos genero[] not null default '{}',
  bio text check (char_length(bio) <= 500),
  carrera_id smallint references carreras (id) on delete set null,
  sede_id smallint references sedes (id) on delete set null,
  anio_ingreso smallint check (anio_ingreso between 2000 and 2100),
  -- Contacto opcional que el usuario decide mostrar después del match.
  instagram text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  -- Rango etario que quiere ver.
  edad_min smallint not null default 18 check (edad_min >= 18),
  edad_max smallint not null default 99 check (edad_max <= 120),
  onboarding_completo boolean not null default false,
  -- Baja lógica: el perfil deja de aparecer en feeds pero conserva sus matches.
  activo boolean not null default true,
  ultima_actividad timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (edad_min <= edad_max)
);

create index profiles_feed_idx on profiles (sede_id, genero)
  where activo and onboarding_completo;

-- Cada perfil declara una o más intenciones. Solo se cruza con gente que
-- comparte al menos una.
create table profile_intenciones (
  profile_id uuid not null references profiles (id) on delete cascade,
  intencion intencion not null,
  primary key (profile_id, intencion)
);

create index profile_intenciones_intencion_idx on profile_intenciones (intencion);

-- Materias que cursa este cuatrimestre. Solo relevante para intención 'estudio'.
create table profile_materias (
  profile_id uuid not null references profiles (id) on delete cascade,
  materia_id integer not null references materias (id) on delete cascade,
  comision text,
  primary key (profile_id, materia_id)
);

create index profile_materias_materia_idx on profile_materias (materia_id);

-- ============================================================
-- 4. Fotos
-- ============================================================
-- Guardamos solo el path dentro del bucket, no la URL completa: si el bucket
-- cambia de nombre o pasa a privado, no hay que reescribir la tabla.

create table fotos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  storage_path text not null,
  orden smallint not null default 0 check (orden between 0 and 5),
  created_at timestamptz not null default now(),
  unique (profile_id, orden)
);

create index fotos_profile_idx on fotos (profile_id, orden);

-- ============================================================
-- 5. Swipes y matches
-- ============================================================
-- El swipe es por intención: alguien puede querer a la misma persona como
-- compañera de estudio y no como cita. Por eso la unique incluye la intención.

create table swipes (
  id bigint generated always as identity primary key,
  emisor_id uuid not null references profiles (id) on delete cascade,
  receptor_id uuid not null references profiles (id) on delete cascade,
  direccion direccion_swipe not null,
  intencion intencion not null,
  created_at timestamptz not null default now(),
  unique (emisor_id, receptor_id, intencion),
  check (emisor_id <> receptor_id)
);

-- Para resolver "¿ya me dio like esta persona?" al insertar el swipe recíproco.
create index swipes_reciproco_idx on swipes (receptor_id, emisor_id, intencion)
  where direccion = 'like';

-- El par se guarda siempre ordenado (profile_a < profile_b) para que el unique
-- impida matches duplicados en espejo.
create table matches (
  id uuid primary key default gen_random_uuid(),
  profile_a uuid not null references profiles (id) on delete cascade,
  profile_b uuid not null references profiles (id) on delete cascade,
  intencion intencion not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  check (profile_a < profile_b),
  unique (profile_a, profile_b, intencion)
);

create index matches_profile_a_idx on matches (profile_a) where activo;
create index matches_profile_b_idx on matches (profile_b) where activo;

-- ============================================================
-- 6. Mensajes
-- ============================================================
-- No hay tabla de conversaciones: el match ya es la conversación.

create table mensajes (
  id bigint generated always as identity primary key,
  match_id uuid not null references matches (id) on delete cascade,
  emisor_id uuid not null references profiles (id) on delete cascade,
  contenido text not null check (char_length(contenido) between 1 and 2000),
  leido_at timestamptz,
  created_at timestamptz not null default now()
);

create index mensajes_match_idx on mensajes (match_id, created_at desc);

-- ============================================================
-- 7. Moderación
-- ============================================================

create table bloqueos (
  bloqueador_id uuid not null references profiles (id) on delete cascade,
  bloqueado_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (bloqueador_id, bloqueado_id),
  check (bloqueador_id <> bloqueado_id)
);

create index bloqueos_bloqueado_idx on bloqueos (bloqueado_id);

create table reportes (
  id uuid primary key default gen_random_uuid(),
  reportante_id uuid not null references profiles (id) on delete cascade,
  reportado_id uuid not null references profiles (id) on delete cascade,
  motivo text not null,
  detalle text check (char_length(detalle) <= 1000),
  estado estado_reporte not null default 'pendiente',
  created_at timestamptz not null default now(),
  check (reportante_id <> reportado_id)
);

create index reportes_pendientes_idx on reportes (created_at desc)
  where estado = 'pendiente';
