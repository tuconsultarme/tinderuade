-- UADencuentros — plan de suscripción del perfil
-- Ejecutar después de 0012.

-- Demo: el plan se activa desde la app (sin pago real todavía). Vive en el
-- perfil para que se pueda mostrar la insignia también en el perfil de los
-- demás. La política "editar perfil propio" (0003) ya deja que cada uno cambie
-- su propio plan, y "perfiles visibles" deja que los demás lo lean.
alter table profiles add column if not exists plan text not null default 'gratis';
alter table profiles drop constraint if exists profiles_plan_check;
alter table profiles add constraint profiles_plan_check check (plan in ('gratis', 'plus', 'gold'));
