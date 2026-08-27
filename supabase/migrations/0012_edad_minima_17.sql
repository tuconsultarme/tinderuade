-- UADencuentros — bajar la edad mínima de 18 a 17
-- Ejecutar después de 0011.

-- 1. Trigger de mayoría de edad: ahora exige 17, no 18.
create or replace function validar_mayoria_edad()
returns trigger
language plpgsql
as $$
begin
  if new.fecha_nacimiento > current_date - interval '17 years' then
    raise exception 'El usuario debe tener al menos 17 años';
  end if;
  return new;
end;
$$;

-- 2. Restricción del rango de búsqueda: la edad mínima puede bajar hasta 17.
alter table profiles drop constraint if exists profiles_edad_min_check;
alter table profiles add constraint profiles_edad_min_check check (edad_min >= 17);
