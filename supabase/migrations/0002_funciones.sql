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
  with yo as (
    select * from profiles where id = auth.uid()
  )
  select
    p.id,
    p.nombre,
    extract(year from age(p.fecha_nacimiento))::integer as edad,
    p.bio,
    c.nombre as carrera,
    s.nombre as sede,
    p.anio_ingreso,
    (
      select count(*)::integer
      from profile_materias pm_yo
      join profile_materias pm_otro
        on pm_otro.materia_id = pm_yo.materia_id
      where pm_yo.profile_id = (select id from yo)
        and pm_otro.profile_id = p.id
    ) as materias_en_comun
  from profiles p
  join yo on true
  left join carreras c on c.id = p.carrera_id
  left join sedes s on s.id = p.sede_id
  where p.id <> yo.id
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
      where sw.emisor_id = yo.id
        and sw.receptor_id = p.id
        and sw.intencion = p_intencion
    )
    -- sin bloqueos en ninguna dirección
    and not exists (
      select 1 from bloqueos b
      where (b.bloqueador_id = yo.id and b.bloqueado_id = p.id)
         or (b.bloqueador_id = p.id and b.bloqueado_id = yo.id)
    )
    -- preferencia de género mutua (solo aplica a citas)
    and (
      p_intencion <> 'citas'
      or (
        (cardinality(yo.busca_generos) = 0 or p.genero = any (yo.busca_generos))
        and (cardinality(p.busca_generos) = 0 or yo.genero = any (p.busca_generos))
      )
    )
    -- rango etario mutuo
    and extract(year from age(p.fecha_nacimiento))::int
        between yo.edad_min and yo.edad_max
    and extract(year from age(yo.fecha_nacimiento))::int
        between p.edad_min and p.edad_max
  order by
    case when p_intencion = 'estudio' then materias_en_comun else 0 end desc,
    p.ultima_actividad desc
  limit p_limite;
$$;

-- ============================================================
-- 5. Helper para RLS de mensajes
-- ============================================================
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
