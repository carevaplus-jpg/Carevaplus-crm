-- Vidya: accounts, offline-first sync and AI tutor usage.
-- Every table has row-level security; students can only ever touch their own rows.

-- ── Public profile summary (for future leaderboards / parent view) ───────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  class_level smallint check (class_level between 6 and 12),
  stream text check (stream in ('PCM', 'PCB')),
  xp integer not null default 0 check (xp >= 0),
  streak integer not null default 0 check (streak >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ── Sync records: one row per local record, last-write-wins ─────────────────
create table if not exists public.sync_records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection text not null check (collection in (
    'progress', 'notes', 'cards', 'tasks', 'exams', 'sessions', 'attempts', 'days', 'unlocks', 'subjects', 'profile'
  )),
  id text not null check (char_length(id) between 1 and 200),
  data jsonb not null check (pg_column_size(data) <= 100000),
  client_updated_at bigint not null,
  deleted boolean not null default false,
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, collection, id)
);

create index if not exists sync_records_pull_idx on public.sync_records (user_id, server_updated_at);

alter table public.sync_records enable row level security;

create policy "sync_select_own" on public.sync_records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "sync_insert_own" on public.sync_records
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "sync_update_own" on public.sync_records
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "sync_delete_own" on public.sync_records
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Batch upsert that keeps whichever copy was edited last on the client.
-- SECURITY INVOKER: runs under the caller's RLS, so it can only write the caller's rows.
create or replace function public.push_records(records jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  written integer;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if jsonb_typeof(records) <> 'array' or jsonb_array_length(records) > 500 then
    raise exception 'records must be an array of at most 500 items' using errcode = '22023';
  end if;

  insert into public.sync_records as s (user_id, collection, id, data, client_updated_at, deleted, server_updated_at)
  select (select auth.uid()),
         r ->> 'collection',
         r ->> 'id',
         r -> 'data',
         (r ->> 'client_updated_at')::bigint,
         coalesce((r ->> 'deleted')::boolean, false),
         clock_timestamp()
  from jsonb_array_elements(records) as r
  on conflict (user_id, collection, id) do update
    set data = excluded.data,
        client_updated_at = excluded.client_updated_at,
        deleted = excluded.deleted,
        server_updated_at = clock_timestamp()
    where s.client_updated_at < excluded.client_updated_at;

  get diagnostics written = row_count;
  return written;
end;
$$;

revoke all on function public.push_records(jsonb) from public, anon;
grant execute on function public.push_records(jsonb) to authenticated;

-- ── AI tutor daily usage (rate limiting) ────────────────────────────────────
create table if not exists public.tutor_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'Asia/Kolkata')::date,
  messages integer not null default 0,
  primary key (user_id, day)
);

alter table public.tutor_usage enable row level security;

create policy "tutor_usage_select_own" on public.tutor_usage
  for select to authenticated using ((select auth.uid()) = user_id);
-- No insert/update policies: rows are written only through bump_tutor_usage().

-- Increments today's counter for the calling student and returns the new count.
-- SECURITY DEFINER so it can write past RLS, but it only ever writes auth.uid()'s row.
create or replace function public.bump_tutor_usage()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  total integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into public.tutor_usage as t (user_id, day, messages)
  values (uid, (now() at time zone 'Asia/Kolkata')::date, 1)
  on conflict (user_id, day) do update set messages = t.messages + 1
  returning messages into total;
  return total;
end;
$$;

revoke all on function public.bump_tutor_usage() from public, anon;
grant execute on function public.bump_tutor_usage() to authenticated;
