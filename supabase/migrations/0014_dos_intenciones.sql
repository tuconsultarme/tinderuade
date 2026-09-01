-- UADencuentros — de tres intenciones a dos
-- Ejecutar después de 0013.
--
-- Cambia el producto: quedan solo `match` y `estudio`.
--   match   → gente que NO es de tu mismo género
--   estudio → gente de tu misma carrera
--
-- `amistad` desaparece y `citas` pasa a llamarse `match`. Los swipes y matches
-- que existían como 'citas' se conservan bajo el nombre nuevo; los de
-- 'amistad' se borran, porque esa intención ya no existe en el producto.
--
-- OJO: esto borra datos. Los matches de amistad y sus conversaciones se van.
--
-- ------------------------------------------------------------------
-- POR QUÉ ESTA MIGRACIÓN VUELVE A APARECER DESPUÉS DE 0011
-- ------------------------------------------------------------------
-- Esta migración se escribió originalmente como 0009 y ya se había aplicado a
-- la base compartida. La 0011 (`arreglar_enum_intencion`) la interpretó como un
-- accidente —un rename hecho a mano desde el dashboard de Supabase— y la
-- revirtió, restaurando `citas` y `amistad` y borrando las filas con `match`.
--
-- No fue un accidente: pasar a dos lentes es una decisión de producto. Así que
-- se vuelve a aplicar acá, ahora ordenada después de 0013 para que el estado
-- final del enum sea el que espera el front (`src/lib/tipos.ts` →
-- `Intencion = 'match' | 'estudio'`).
--
-- El paso 2 tolera el estado que dejó 0011: en este punto el enum puede tener
-- los cuatro valores (`match`, `estudio`, `citas`, `amistad`). El USING mapea
-- `citas`→`match` y deja `match` y `estudio` como están; las filas `amistad`
-- ya se borraron en el paso 1.
--
-- Los datos que 0011 borró no se recuperan. Según su propio comentario eran
-- perfiles y swipes de prueba del seed, así que se vuelve a correr
-- `scripts/seed-demo.mjs` y listo.

begin;

-- ============================================================
-- 1. Sacar lo que era 'amistad'
-- ============================================================
-- Los mensajes cuelgan de matches con on delete cascade, así que se van solos.

delete from matches where intencion = 'amistad';
delete from swipes where intencion = 'amistad';
delete from profile_intenciones where intencion = 'amistad';

-- ============================================================
-- 2. Reemplazar el tipo
-- ============================================================
-- Postgres no deja quitar un valor de un enum: hay que crear el tipo nuevo,
-- migrar las columnas y descartar el viejo. El renombre de 'citas' a 'match'
-- se hace en el mismo USING, así no hacen falta dos pasadas.

-- Cualquier función que mencione el tipo en su firma bloquea el DROP TYPE.
-- `get_candidatos` la recreamos nosotros más abajo, pero puede haber otras
-- creadas a mano desde el SQL Editor y que no estén en estas migraciones
-- (pasó con `mis_likes_recibidos()`). En vez de borrarlas con CASCADE y
-- perderlas, se guarda su definición, se las borra y se las vuelve a crear
-- igual al final.
create temp table _funcs_guardadas on commit drop as
select
  p.oid::regprocedure::text as firma,
  pg_get_functiondef(p.oid) as definicion
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname <> 'get_candidatos'
  and (
    -- el tipo aparece en los argumentos o en el valor de retorno
    'intencion'::regtype = any (p.proargtypes::oid[])
    or p.prorettype = 'intencion'::regtype
    or exists (
      select 1 from unnest(coalesce(p.proallargtypes, p.proargtypes::oid[])) a
      where a = 'intencion'::regtype
    )
  );

do $$
declare r record;
begin
  for r in select firma from _funcs_guardadas loop
    raise notice 'Guardada para recrear: %', r.firma;
    execute format('drop function %s', r.firma);
  end loop;
end $$;

drop function if exists get_candidatos(intencion, integer);

create type intencion_nueva as enum ('match', 'estudio');

alter table profile_intenciones
  alter column intencion type intencion_nueva
  using (case intencion::text when 'citas' then 'match' else intencion::text end)::intencion_nueva;

alter table swipes
  alter column intencion type intencion_nueva
  using (case intencion::text when 'citas' then 'match' else intencion::text end)::intencion_nueva;

alter table matches
  alter column intencion type intencion_nueva
  using (case intencion::text when 'citas' then 'match' else intencion::text end)::intencion_nueva;

drop type intencion;
alter type intencion_nueva rename to intencion;

-- ============================================================
-- 3. Feed con las reglas nuevas
-- ============================================================
-- Cambia respecto de 0002:
--   - El filtro de género ya no usa `busca_generos`: en `match` la regla es
--     dura, no una preferencia. La columna queda en la tabla por si alguna vez
--     se vuelve a un sistema de preferencias, pero hoy no se lee.
--   - `estudio` exige misma carrera. Quien no tenga carrera cargada no ve a
--     nadie en esa lente; el front lo avisa en el estado vacío.

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
        profiles.carrera_id as yo_carrera,
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
      -- MATCH: nadie de tu mismo género.
      --
      -- Se expresa como "distinto" y no como "el opuesto exacto" a propósito.
      -- Con cuatro géneros posibles, el opuesto exacto solo está definido para
      -- masculino y femenino: quien se anote como no binario u otro no vería a
      -- nadie y nadie lo vería, o sea que la app le quedaría rota. Así, un
      -- usuario masculino ve femenino, no binario y otro.
      --
      -- Si lo querés estrictamente binario, reemplazá esta condición por:
      --   and (p_intencion <> 'match' or (
      --         (yo.yo_genero = 'masculino' and p.genero = 'femenino') or
      --         (yo.yo_genero = 'femenino'  and p.genero = 'masculino')))
      and (p_intencion <> 'match' or p.genero <> yo.yo_genero)
      -- ESTUDIO: solo tu misma carrera.
      and (
        p_intencion <> 'estudio'
        or (yo.yo_carrera is not null and p.carrera_id = yo.yo_carrera)
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
-- 4. Volver a crear las funciones que se guardaron en el paso 2
-- ============================================================
-- Se reemplaza 'citas' por 'match' dentro del cuerpo por si alguna comparaba
-- contra el valor viejo. Si alguna mencionaba 'amistad' va a fallar acá, y con
-- razón: esa intención ya no existe y hay que revisarla a mano.

do $$
declare
  r record;
  cuerpo text;
begin
  for r in select firma, definicion from _funcs_guardadas loop
    cuerpo := replace(r.definicion, '''citas''', '''match''');
    begin
      execute cuerpo;
      raise notice 'Recreada: %', r.firma;
    exception when others then
      raise warning 'NO se pudo recrear %: %. Revisala a mano.', r.firma, sqlerrm;
    end;
  end loop;
end $$;

commit;
