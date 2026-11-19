-- Applied to the Careva+ Supabase project as migration "careva_ai_chat_sync".
-- Chats for the Careva+ AI phone app, synced between a person's phones. Separate from the CRM tables.
create table public.ai_chats (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Chat',
  messages jsonb not null default '[]'::jsonb,
  updated bigint not null,            -- milliseconds since 1970, set by the phone; newest wins
  deleted boolean not null default false,
  synced_at timestamptz not null default now()
);

create index ai_chats_user_updated on public.ai_chats (user_id, updated desc);

alter table public.ai_chats enable row level security;

create policy "ai_chats: owner reads" on public.ai_chats for select to authenticated
  using (user_id = (select auth.uid()));
create policy "ai_chats: owner inserts" on public.ai_chats for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "ai_chats: owner updates" on public.ai_chats for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "ai_chats: owner deletes" on public.ai_chats for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.ai_chats from anon;
grant select, insert, update, delete on public.ai_chats to authenticated;

create or replace function public.ai_chats_touch() returns trigger
language plpgsql set search_path = '' as $$
begin new.synced_at := now(); return new; end $$;

create trigger ai_chats_touch before insert or update on public.ai_chats
  for each row execute function public.ai_chats_touch();
