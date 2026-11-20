-- Applied to the Careva+ Supabase project as migration "careva_ai_agents".
-- Custom agents (assistants with their own instructions) made by Careva+ AI users, synced between their phones.
create table public.ai_agents (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  emoji text not null default '🤖',
  instructions text not null default '',
  updated bigint not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default now()
);
create index ai_agents_user on public.ai_agents (user_id);
alter table public.ai_agents enable row level security;
create policy "ai_agents: owner reads" on public.ai_agents for select to authenticated using (user_id = (select auth.uid()));
create policy "ai_agents: owner inserts" on public.ai_agents for insert to authenticated with check (user_id = (select auth.uid()));
create policy "ai_agents: owner updates" on public.ai_agents for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "ai_agents: owner deletes" on public.ai_agents for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.ai_agents from anon;
grant select, insert, update, delete on public.ai_agents to authenticated;
create trigger ai_agents_touch before insert or update on public.ai_agents for each row execute function public.ai_chats_touch();

-- Which agent a chat uses (null = the normal assistant).
alter table public.ai_chats add column agent uuid;
