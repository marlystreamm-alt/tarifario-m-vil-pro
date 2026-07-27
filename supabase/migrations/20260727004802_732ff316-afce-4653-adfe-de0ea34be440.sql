-- ROLES
create type public.app_role as enum ('superadmin', 'admin', 'employee');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "profiles_select_own" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'superadmin') or public.has_role(auth.uid(), 'admin'));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "user_roles_select" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'superadmin') or public.has_role(auth.uid(), 'admin'));

-- AUDITORIA INMUTABLE
create table public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  result text not null default 'success',
  ip text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.security_events to authenticated;
grant all on public.security_events to service_role;
alter table public.security_events enable row level security;
create policy "security_events_read_admins" on public.security_events for select to authenticated
  using (public.has_role(auth.uid(), 'superadmin') or public.has_role(auth.uid(), 'admin'));
-- Sin políticas de insert/update/delete para clientes: solo el servidor escribe.
create index security_events_created_at_idx on public.security_events (created_at desc);

create or replace function public.block_security_events_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'La bitácora de seguridad es inmutable';
end;
$$;
create trigger security_events_no_update before update or delete on public.security_events
  for each row execute function public.block_security_events_mutation();

-- CODIGOS DE RECUPERACION (solo hash)
create table public.recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
grant all on public.recovery_codes to service_role;
alter table public.recovery_codes enable row level security;
-- Sin grants ni políticas para authenticated/anon: nunca legibles desde el cliente.

-- CONFIGURACION DE SEGURIDAD
create table public.security_settings (
  id boolean primary key default true check (id),
  inactivity_minutes integer not null default 15 check (inactivity_minutes between 1 and 480),
  require_2fa_superadmin boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.security_settings to authenticated;
grant all on public.security_settings to service_role;
alter table public.security_settings enable row level security;
create policy "security_settings_read" on public.security_settings for select to authenticated using (true);
create policy "security_settings_write" on public.security_settings for update to authenticated
  using (public.has_role(auth.uid(), 'superadmin')) with check (public.has_role(auth.uid(), 'superadmin'));
insert into public.security_settings (id) values (true);

-- TIMESTAMPS
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();
create trigger security_settings_updated_at before update on public.security_settings
  for each row execute function public.update_updated_at_column();

-- ALTA AUTOMATICA DE PERFIL Y ROL
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (id) do nothing;

  select not exists (select 1 from public.user_roles) into is_first;

  insert into public.user_roles (user_id, role)
  values (new.id, case when is_first then 'superadmin'::public.app_role else 'employee'::public.app_role end)
  on conflict do nothing;

  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();