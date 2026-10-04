create type public.app_role as enum ('head', 'specialist', 'auditor');

create table public.profiles (
  id uuid primary key,
  login text not null unique,
  name text not null,
  position text not null default '',
  initials text not null default '',
  last_sign_in_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  unique (user_id)
);
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "Staff can view profiles" on public.profiles for select to authenticated using (true);
create policy "Users update own presence" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Staff can view roles" on public.user_roles for select to authenticated using (true);
create policy "Head inserts roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(), 'head'));
create policy "Head updates roles" on public.user_roles for update to authenticated using (public.has_role(auth.uid(), 'head')) with check (public.has_role(auth.uid(), 'head'));
create policy "Head deletes roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(), 'head'));

-- users may only touch presence columns on their own profile
create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user = 'authenticated' then
    new.login := old.login; new.name := old.name; new.position := old.position; new.initials := old.initials;
  end if;
  return new;
end $$;
create trigger protect_profile_fields before update on public.profiles for each row execute function public.protect_profile_fields();