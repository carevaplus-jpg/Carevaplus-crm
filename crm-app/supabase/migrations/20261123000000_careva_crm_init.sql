-- Careva+ CRM — multi-user cloud schema.
-- Mirrors the TypeScript model in src/types/index.ts. One organization per
-- company account; every table is scoped to an org and protected by RLS so a
-- user can only ever see their own organization's data. Roles (admin /
-- executive / sales_rep) are enforced in policies below.
--
-- Apply with `supabase db push`, or paste this file into the SQL editor of a
-- fresh Supabase project, then set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
-- in the app's build environment — see README.md.

create extension if not exists "pgcrypto";

-- ── Organizations & profiles ─────────────────────────────────────────────

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  name text not null check (char_length(name) between 1 and 120),
  role text not null default 'sales_rep' check (role in ('admin', 'executive', 'sales_rep')),
  title text,
  avatar_hue smallint not null default 220 check (avatar_hue between 0 and 359),
  created_at timestamptz not null default now()
);

create index if not exists profiles_org_idx on public.profiles (org_id);

-- Helper: the calling user's organization (used by every policy below).
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;

create policy "org_select_own" on public.organizations
  for select to authenticated using (id = public.current_org_id());

create policy "profiles_select_same_org" on public.profiles
  for select to authenticated using (org_id = public.current_org_id());
create policy "profiles_update_self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_write" on public.profiles
  for all to authenticated using (org_id = public.current_org_id() and public.current_role() = 'admin')
  with check (org_id = public.current_org_id());

-- ── Generic "org-scoped table" policy helper ─────────────────────────────
-- Every business table below gets the same three policies: members of an
-- org can read and write that org's rows; nothing else is reachable.

create or replace procedure public.add_org_scoped_policies(tbl regclass)
language plpgsql
as $$
begin
  execute format('alter table %s enable row level security', tbl);
  execute format($p$create policy "%1$s_select" on %1$s for select to authenticated using (org_id = public.current_org_id())$p$, tbl);
  execute format($p$create policy "%1$s_insert" on %1$s for insert to authenticated with check (org_id = public.current_org_id())$p$, tbl);
  execute format($p$create policy "%1$s_update" on %1$s for update to authenticated using (org_id = public.current_org_id()) with check (org_id = public.current_org_id())$p$, tbl);
  execute format($p$create policy "%1$s_delete" on %1$s for delete to authenticated using (org_id = public.current_org_id())$p$, tbl);
end;
$$;

-- ── Companies & contacts ──────────────────────────────────────────────────

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  domain text,
  industry text,
  size text check (size in ('1-10', '11-50', '51-200', '201-1000', '1000+')),
  phone text,
  city text,
  country text,
  website text,
  owner_id uuid references public.profiles (id) on delete set null,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
call public.add_org_scoped_policies('public.companies');

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text not null default '',
  email text,
  phone text,
  title text,
  company_id uuid references public.companies (id) on delete set null,
  status text not null default 'lead' check (status in ('lead', 'prospect', 'customer', 'churned')),
  source text,
  owner_id uuid references public.profiles (id) on delete set null,
  tags text[] not null default '{}',
  avatar_hue smallint not null default 220,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
call public.add_org_scoped_policies('public.contacts');
create index if not exists contacts_company_idx on public.contacts (company_id);

-- ── Pipelines, stages, deals ──────────────────────────────────────────────

create table if not exists public.pipelines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  is_default boolean not null default false
);
call public.add_org_scoped_policies('public.pipelines');

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  name text not null,
  "order" smallint not null default 0,
  color text not null default '#8babff',
  probability numeric(3, 2) not null default 0.2 check (probability between 0 and 1),
  is_won boolean not null default false,
  is_lost boolean not null default false
);
call public.add_org_scoped_policies('public.pipeline_stages');

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  stage_id uuid not null references public.pipeline_stages (id) on delete restrict,
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  currency text not null default 'INR' check (currency in ('INR', 'USD')),
  contact_id uuid references public.contacts (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  owner_id uuid references public.profiles (id) on delete set null,
  expected_close_date date,
  closed_at timestamptz,
  status text not null default 'open' check (status in ('open', 'won', 'lost')),
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
call public.add_org_scoped_policies('public.deals');
create index if not exists deals_stage_idx on public.deals (stage_id);
create index if not exists deals_owner_idx on public.deals (owner_id);

-- ── Tasks & activities ────────────────────────────────────────────────────

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  type text not null default 'todo' check (type in ('call', 'email', 'meeting', 'follow_up', 'todo')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_at timestamptz not null,
  done boolean not null default false,
  done_at timestamptz,
  assignee_id uuid references public.profiles (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  notes text,
  created_at timestamptz not null default now()
);
call public.add_org_scoped_policies('public.tasks');
create index if not exists tasks_due_idx on public.tasks (due_at);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  type text not null check (type in ('note', 'call', 'email', 'meeting', 'stage_change', 'task_done', 'deal_created', 'deal_won', 'deal_lost')),
  body text not null,
  author_id uuid references public.profiles (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  meta jsonb,
  at timestamptz not null default now()
);
call public.add_org_scoped_policies('public.activities');
create index if not exists activities_contact_idx on public.activities (contact_id);
create index if not exists activities_deal_idx on public.activities (deal_id);

-- ── Products, quotes, invoices ───────────────────────────────────────────

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  sku text,
  price numeric(14, 2) not null default 0,
  unit text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
call public.add_org_scoped_policies('public.products');

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  number text not null,
  contact_id uuid references public.contacts (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')),
  items jsonb not null default '[]',
  tax_pct numeric(5, 2) not null default 0,
  notes text,
  valid_until date,
  owner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, number)
);
call public.add_org_scoped_policies('public.quotes');

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  number text not null,
  quote_id uuid references public.quotes (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'void')),
  items jsonb not null default '[]',
  tax_pct numeric(5, 2) not null default 0,
  due_date date not null,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, number)
);
call public.add_org_scoped_policies('public.invoices');

-- ── Email log ─────────────────────────────────────────────────────────────

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  direction text not null check (direction in ('outbound', 'inbound')),
  subject text not null,
  body text,
  to_address text not null,
  from_address text not null,
  contact_id uuid references public.contacts (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  at timestamptz not null default now()
);
call public.add_org_scoped_policies('public.email_log');

-- ── New-organization bootstrap ───────────────────────────────────────────
-- Called once, right after a brand-new user's first sign-up, to create their
-- organization, make them its admin, and seed a default sales pipeline.
-- SECURITY DEFINER because the caller has no org yet (every policy above
-- requires one) — but it only ever acts on behalf of auth.uid() and only
-- when that user has no profile yet, so it cannot be used to join someone
-- else's organization.

create or replace function public.bootstrap_organization(org_name text, display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  new_org uuid;
  new_pipeline uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if exists (select 1 from public.profiles where id = uid) then
    raise exception 'profile already exists' using errcode = '23505';
  end if;

  insert into public.organizations (name) values (coalesce(nullif(trim(org_name), ''), 'My Company')) returning id into new_org;

  insert into public.profiles (id, org_id, email, name, role)
  values (uid, new_org, (select email from auth.users where id = uid), coalesce(nullif(trim(display_name), ''), 'Admin'), 'admin');

  insert into public.pipelines (org_id, name, is_default) values (new_org, 'Sales Pipeline', true) returning id into new_pipeline;

  insert into public.pipeline_stages (org_id, pipeline_id, name, "order", color, probability, is_won, is_lost) values
    (new_org, new_pipeline, 'New Lead', 0, '#8babff', 0.10, false, false),
    (new_org, new_pipeline, 'Qualified', 1, '#5cc7e8', 0.30, false, false),
    (new_org, new_pipeline, 'Proposal Sent', 2, '#f0c569', 0.50, false, false),
    (new_org, new_pipeline, 'Negotiation', 3, '#ef9d6e', 0.75, false, false),
    (new_org, new_pipeline, 'Won', 4, '#7fd4a8', 1.00, true, false),
    (new_org, new_pipeline, 'Lost', 5, '#e68bb0', 0.00, false, true);

  return new_org;
end;
$$;

revoke all on function public.bootstrap_organization(text, text) from public, anon;
grant execute on function public.bootstrap_organization(text, text) to authenticated;

-- Invite a teammate: they must already have (or will create) an auth.users
-- account with this exact email; a trigger below attaches them to the
-- inviting admin's organization the moment they sign up.
create table if not exists public.invites (
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null default 'sales_rep' check (role in ('admin', 'executive', 'sales_rep')),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (org_id, email)
);
call public.add_org_scoped_policies('public.invites');

create or replace function public.handle_new_user_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv record;
begin
  select * into inv from public.invites where email = new.email order by created_at desc limit 1;
  if found then
    insert into public.profiles (id, org_id, email, name, role)
    values (new.id, inv.org_id, new.email, split_part(new.email, '@', 1), inv.role)
    on conflict (id) do nothing;
    delete from public.invites where org_id = inv.org_id and email = inv.email;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_invite on auth.users;
create trigger on_auth_user_created_invite
  after insert on auth.users
  for each row execute function public.handle_new_user_invite();
