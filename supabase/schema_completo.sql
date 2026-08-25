-- UADencuentros — schema completo
-- Generado desde migrations/ + seed.sql. Pegar todo junto en el SQL Editor de Supabase.
-- Validado contra PostgreSQL 16 con stubs de auth/storage: 23 tests funcionales en verde.

-- ############################################################
-- ### migrations/0001_schema_inicial.sql
-- ############################################################

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

-- ############################################################
-- ### migrations/0002_funciones.sql
-- ############################################################

-- UADencuentros — funciones y triggers
-- Ejecutar después de 0001.

-- ============================================================
-- 1. updated_at automático
-- ============================================================

create or replace function tocar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row
  execute function tocar_updated_at();

-- ============================================================
-- 2. Validaciones que no entran en un CHECK
-- ============================================================
-- current_date no es IMMUTABLE, así que la edad mínima no puede validarse con
-- un CHECK constraint y va acá.

create or replace function validar_mayoria_edad()
returns trigger
language plpgsql
as $$
begin
  if new.fecha_nacimiento > current_date - interval '18 years' then
    raise exception 'El usuario debe ser mayor de 18 años';
  end if;
  return new;
end;
$$;

create trigger profiles_mayoria_edad
  before insert or update of fecha_nacimiento on profiles
  for each row
  execute function validar_mayoria_edad();

-- Tope de 6 fotos por perfil (orden 0..5 ya lo acota, pero esto da un error claro).
create or replace function validar_limite_fotos()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from fotos where profile_id = new.profile_id) >= 6 then
    raise exception 'Máximo 6 fotos por perfil';
  end if;
  return new;
end;
$$;

create trigger fotos_limite
  before insert on fotos
  for each row
  execute function validar_limite_fotos();

-- ============================================================
-- 3. Creación automática del match
-- ============================================================
-- Cuando entra un 'like', busca el like recíproco para la misma intención.
-- Si existe, crea el match con el par ordenado.

create or replace function crear_match_si_reciproco()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hay_reciproco boolean;
begin
  if new.direccion <> 'like' then
    return new;
  end if;

  select exists (
    select 1 from swipes
    where emisor_id = new.receptor_id
      and receptor_id = new.emisor_id
      and intencion = new.intencion
      and direccion = 'like'
  ) into hay_reciproco;

  if hay_reciproco then
    insert into matches (profile_a, profile_b, intencion)
    values (
      least(new.emisor_id, new.receptor_id),
      greatest(new.emisor_id, new.receptor_id),
      new.intencion
    )
    on conflict (profile_a, profile_b, intencion) do nothing;
  end if;

  return new;
end;
$$;

create trigger swipes_crear_match
  after insert on swipes
  for each row
  execute function crear_match_si_reciproco();

-- ============================================================
-- 4. Feed de candidatos
-- ============================================================
-- Devuelve perfiles compatibles para una intención dada, excluyendo:
--   - uno mismo
--   - perfiles inactivos o sin onboarding
--   - gente ya swipeada para esa intención
--   - bloqueos en cualquiera de las dos direcciones
--   - géneros y rango etario fuera de la preferencia mutua
-- Para 'estudio' prioriza a quien comparte materias.

-- Ojo con dos trampas de Postgres que este armado evita a propósito:
--   1. Los nombres de RETURNS TABLE son visibles como variables dentro del
--      cuerpo, así que una referencia sin calificar a `id` o `nombre` sale
--      ambigua. Por eso la subconsulta usa el prefijo cand_.
--   2. Un alias de salida en ORDER BY tiene que ir solo; no se puede meter
--      dentro de una expresión como un CASE. De ahí la subconsulta envolvente.

create or replace function get_candidatos(
  p_intencion intencion,
  p_limite integer default 20
)
returns table (
  id uuid,
  nombre text,
  edad integer,
  bio text,
  carrera text,
  sede text,
  anio_ingreso smallint,
  materias_en_comun integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    cand.cand_id,
    cand.cand_nombre,
    cand.cand_edad,
    cand.cand_bio,
    cand.cand_carrera,
    cand.cand_sede,
    cand.cand_anio,
    cand.cand_materias
  from (
    select
      p.id as cand_id,
      p.nombre as cand_nombre,
      extract(year from age(p.fecha_nacimiento))::integer as cand_edad,
      p.bio as cand_bio,
      c.nombre as cand_carrera,
      s.nombre as cand_sede,
      p.anio_ingreso as cand_anio,
      (
        select count(*)::integer
        from profile_materias pm_yo
        join profile_materias pm_otro
          on pm_otro.materia_id = pm_yo.materia_id
        where pm_yo.profile_id = yo.yo_id
          and pm_otro.profile_id = p.id
      ) as cand_materias,
      p.ultima_actividad as cand_actividad
    from profiles p
    cross join (
      select
        profiles.id as yo_id,
        profiles.genero as yo_genero,
        profiles.busca_generos as yo_busca_generos,
        profiles.fecha_nacimiento as yo_nacimiento,
        profiles.edad_min as yo_edad_min,
        profiles.edad_max as yo_edad_max
      from profiles
      where profiles.id = auth.uid()
    ) yo
    left join carreras c on c.id = p.carrera_id
    left join sedes s on s.id = p.sede_id
    where p.id <> yo.yo_id
      and p.activo
      and p.onboarding_completo
      -- comparte la intención buscada
      and exists (
        select 1 from profile_intenciones pi
        where pi.profile_id = p.id and pi.intencion = p_intencion
      )
      -- todavía no lo swipeé para esta intención
      and not exists (
        select 1 from swipes sw
        where sw.emisor_id = yo.yo_id
          and sw.receptor_id = p.id
          and sw.intencion = p_intencion
      )
      -- sin bloqueos en ninguna dirección
      and not exists (
        select 1 from bloqueos b
        where (b.bloqueador_id = yo.yo_id and b.bloqueado_id = p.id)
           or (b.bloqueador_id = p.id and b.bloqueado_id = yo.yo_id)
      )
      -- preferencia de género mutua (solo aplica a citas)
      and (
        p_intencion <> 'citas'
        or (
          (cardinality(yo.yo_busca_generos) = 0 or p.genero = any (yo.yo_busca_generos))
          and (cardinality(p.busca_generos) = 0 or yo.yo_genero = any (p.busca_generos))
        )
      )
      -- rango etario mutuo
      and extract(year from age(p.fecha_nacimiento))::int
          between yo.yo_edad_min and yo.yo_edad_max
      and extract(year from age(yo.yo_nacimiento))::int
          between p.edad_min and p.edad_max
  ) cand
  order by
    case when p_intencion = 'estudio' then cand.cand_materias else 0 end desc,
    cand.cand_actividad desc
  limit p_limite;
$$;

-- ============================================================
-- 5. Helpers para RLS
-- ============================================================
-- ¿Hay bloqueo entre el usuario actual y otro, en cualquier dirección?
--
-- Va en SECURITY DEFINER por una razón concreta: la RLS de `bloqueos` solo
-- deja ver las filas donde uno es el bloqueador. Si la política de `profiles`
-- consultara la tabla directamente, jamás vería las filas de quien *te*
-- bloqueó a vos, y esa persona te seguiría apareciendo. Bypassear la RLS acá
-- es lo que hace que el bloqueo funcione en las dos direcciones.

create or replace function hay_bloqueo(p_otro_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from bloqueos b
    where (b.bloqueador_id = auth.uid() and b.bloqueado_id = p_otro_id)
       or (b.bloqueador_id = p_otro_id and b.bloqueado_id = auth.uid())
  );
$$;

-- Se usa en las políticas de 0003. Va en SECURITY DEFINER para que la política
-- pueda leer matches sin recursión con la RLS de matches.

create or replace function es_participante_del_match(p_match_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from matches m
    where m.id = p_match_id
      and m.activo
      and auth.uid() in (m.profile_a, m.profile_b)
  );
$$;

-- ############################################################
-- ### migrations/0003_rls.sql
-- ############################################################

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

-- ############################################################
-- ### migrations/0004_storage.sql
-- ############################################################

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

-- ############################################################
-- ### migrations/0005_reordenar_fotos.sql
-- ############################################################

-- UADencuentros — reordenar el carrusel de fotos
-- Ejecutar después de 0004.
--
-- Por qué hace falta una función y no alcanza con UPDATEs desde el cliente:
-- `fotos` tiene unique (profile_id, orden) y un CHECK que acota orden a 0..5.
-- Cualquier permutación real pasa por un estado intermedio con dos filas en la
-- misma posición, y desde PostgREST no hay transacción del lado del cliente
-- para diferir la restricción. Acá se hace todo en una sola llamada: se
-- estacionan las filas en un rango libre y después se bajan a su destino.
--
-- El CHECK de orden se relaja a 0..99 para dejar lugar al estacionamiento.
-- Sigue impidiendo valores absurdos y el tope real de 6 fotos lo cuida el
-- trigger `fotos_limite`.

alter table fotos drop constraint if exists fotos_orden_check;
alter table fotos add constraint fotos_orden_check check (orden between 0 and 99);

create or replace function reordenar_fotos(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  i integer;
begin
  if p_ids is null or cardinality(p_ids) = 0 then
    return;
  end if;

  -- Todas las fotos nombradas tienen que ser del usuario que llama. Sin esto,
  -- alguien podría pasar ids ajenos: el UPDATE lo frenaría la RLS, pero es
  -- mejor un error claro que un reordenamiento a medias.
  if exists (
    select 1 from fotos
    where id = any (p_ids) and profile_id <> auth.uid()
  ) then
    raise exception 'Solo se pueden reordenar fotos propias';
  end if;

  if exists (
    select 1 from fotos
    where profile_id = auth.uid()
      and id <> all (p_ids)
  ) then
    raise exception 'Hay que pasar todas las fotos del perfil, no un subconjunto';
  end if;

  -- Paso 1: estacionar fuera del rango de destino para liberar 0..5.
  for i in 1 .. cardinality(p_ids) loop
    update fotos set orden = 89 + i where id = p_ids[i];
  end loop;

  -- Paso 2: bajar cada una a su posición final, en el orden del array.
  for i in 1 .. cardinality(p_ids) loop
    update fotos set orden = i - 1 where id = p_ids[i];
  end loop;
end;
$$;

-- ############################################################
-- ### migrations/0006_visibilidad_fotos_bloqueos.sql
-- ############################################################

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

-- ############################################################
-- ### migrations/0007_deshacer_swipe.sql
-- ############################################################

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

-- ############################################################
-- ### seed.sql
-- ############################################################

-- UADencuentros — datos de catálogo
--
-- OJO: este listado de sedes y carreras lo armé de memoria y puede estar
-- desactualizado o incompleto. Revisalo contra la web de UADE antes de darlo
-- por bueno; corregir un INSERT ahora es gratis, después no.
--
-- Ejecutar con la service_role key (el SQL Editor del dashboard ya la usa).

insert into sedes (nombre) values
  ('Monserrat'),
  ('Belgrano'),
  ('Costa Argentina'),
  ('Virtual')
on conflict (nombre) do nothing;

insert into carreras (nombre, facultad) values
  -- Ingeniería y Ciencias Exactas
  ('Ingeniería en Informática', 'Ingeniería y Ciencias Exactas'),
  ('Ingeniería Industrial', 'Ingeniería y Ciencias Exactas'),
  ('Ingeniería Electrónica', 'Ingeniería y Ciencias Exactas'),
  ('Ingeniería en Telecomunicaciones', 'Ingeniería y Ciencias Exactas'),
  ('Ingeniería en Alimentos', 'Ingeniería y Ciencias Exactas'),
  ('Licenciatura en Gestión de Tecnología de la Información', 'Ingeniería y Ciencias Exactas'),
  ('Licenciatura en Ciencia de Datos', 'Ingeniería y Ciencias Exactas'),

  -- Ciencias Económicas (verificado contra uade.edu.ar/facultad-de-ciencias-economicas
  -- el 2026-08-24; se dejan afuera las variantes por sede, las dobles
  -- titulaciones y las diplomaturas cortas)
  ('Contador Público', 'Ciencias Económicas'),
  ('Licenciatura en Administración de Empresas', 'Ciencias Económicas'),
  ('Licenciatura en Comercio Internacional', 'Ciencias Económicas'),
  ('Licenciatura en Dirección de Negocios Globales (GBM)', 'Ciencias Económicas'),
  ('Licenciatura en Dirección en Finanzas Globales (GFM)', 'Ciencias Económicas'),
  ('Licenciatura en Economía', 'Ciencias Económicas'),
  ('Licenciatura en Finanzas', 'Ciencias Económicas'),
  ('Licenciatura en Finanzas Digitales', 'Ciencias Económicas'),
  ('Licenciatura en Marketing', 'Ciencias Económicas'),
  ('Licenciatura en Negocios Digitales', 'Ciencias Económicas'),
  ('Licenciatura en Recursos Humanos', 'Ciencias Económicas'),
  ('Tecnicatura Universitaria en Comercio Electrónico e Innovación Digital', 'Ciencias Económicas'),
  ('Tecnicatura Universitaria en Finanzas Digitales', 'Ciencias Económicas'),

  -- Ciencias Jurídicas y Sociales
  ('Abogacía', 'Ciencias Jurídicas y Sociales'),
  ('Licenciatura en Relaciones Internacionales', 'Ciencias Jurídicas y Sociales'),

  -- Ciencias de la Salud (verificado contra
  -- uade.edu.ar/facultad-de-ciencias-de-la-salud el 2026-08-24; Psicología
  -- estaba mal puesta en Ciencias Jurídicas y Sociales, es de acá)
  ('Licenciatura en Gestión de Servicios de Salud', 'Ciencias de la Salud'),
  ('Licenciatura en Nutrición', 'Ciencias de la Salud'),
  ('Licenciatura en Psicología', 'Ciencias de la Salud'),
  ('Licenciatura en Tecnología de Datos con Orientación en Salud Digital', 'Ciencias de la Salud'),

  -- Diseño
  ('Diseño Gráfico', 'Diseño'),
  ('Diseño Industrial', 'Diseño'),
  ('Diseño de Indumentaria y Textil', 'Diseño'),
  ('Diseño Multimedial', 'Diseño'),

  -- Comunicación
  ('Licenciatura en Publicidad', 'Comunicación'),
  ('Licenciatura en Comunicación Audiovisual', 'Comunicación'),

  -- Arquitectura y Urbanismo
  ('Arquitectura', 'Arquitectura y Urbanismo')
on conflict (nombre) do nothing;

-- Las materias van vacías a propósito: conviene cargarlas por carrera cuando
-- definamos el flujo de "buscar compañero de estudio", para no llenar la tabla
-- con un plan de estudios que quizás no usemos.
