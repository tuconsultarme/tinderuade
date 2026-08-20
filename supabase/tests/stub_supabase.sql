-- Stubs que imitan lo que Supabase provee, para validar el schema en un
-- Postgres vanilla. NO forma parte del proyecto.

create schema if not exists auth;
create schema if not exists storage;

create role anon;
create role authenticated;
create role service_role;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique
);

-- auth.uid() lee el claim del JWT; acá lo simulamos con un GUC de sesión.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select string_to_array(name, '/');
$$;

create publication supabase_realtime;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth, storage to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
