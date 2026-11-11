-- Push notifications: device tokens + DB triggers that call the `push` edge function,
-- plus a public "downloads" bucket that hosts the Android APK.
create extension if not exists pg_net with schema extensions;

create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
drop policy if exists push_own_read on public.push_tokens;
create policy push_own_read on public.push_tokens for select to authenticated using (user_id = auth.uid());
drop policy if exists push_own_delete on public.push_tokens;
create policy push_own_delete on public.push_tokens for delete to authenticated using (user_id = auth.uid());

-- A phone can change hands (shared family phone): registering always moves the token to the caller.
create or replace function public.register_push_token(p_token text, p_platform text default 'android')
returns void language sql security definer set search_path = public as $$
  insert into public.push_tokens(token, user_id, platform, updated_at)
  values (p_token, auth.uid(), coalesce(p_platform, 'android'), now())
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
$$;
revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- Shared secret between the triggers and the edge function, generated here and kept in Vault.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'push_hook_secret', 'Authenticates DB triggers calling the push edge function')
where not exists (select 1 from vault.secrets where name = 'push_hook_secret');

create or replace function public.push_hook_ok(s text)
returns boolean language sql security definer set search_path = public, vault as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'push_hook_secret' and decrypted_secret = s);
$$;
revoke all on function public.push_hook_ok(text) from public, anon, authenticated;
grant execute on function public.push_hook_ok(text) to service_role;

create or replace function public.tg_push()
returns trigger language plpgsql security definer set search_path = public, vault, extensions as $$
declare sec text;
begin
  select decrypted_secret into sec from vault.decrypted_secrets where name = 'push_hook_secret';
  perform net.http_post(
    url := 'https://prjedhzcrrboyhewvcar.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', sec),
    body := jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP, 'id', NEW.id, 'doc', NEW.doc, 'old', case when TG_OP = 'UPDATE' then OLD.doc end)
  );
  return NEW;
exception when others then
  return NEW; -- never block the write because of a notification problem
end $$;
revoke all on function public.tg_push() from public, anon, authenticated;

drop trigger if exists z_push on public.messages;
create trigger z_push after insert on public.messages for each row execute function public.tg_push();
drop trigger if exists z_push on public.alerts;
create trigger z_push after insert on public.alerts for each row execute function public.tg_push();
drop trigger if exists z_push on public.notifications;
create trigger z_push after insert on public.notifications for each row execute function public.tg_push();
drop trigger if exists z_push on public.visits;
create trigger z_push after insert on public.visits for each row execute function public.tg_push();
drop trigger if exists z_push_reassign on public.visits;
create trigger z_push_reassign after update on public.visits for each row
  when (old.staff_id is distinct from new.staff_id) execute function public.tg_push();

-- Public bucket for the Android app download (read-only to the public).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('downloads', 'downloads', true, 52428800, array['application/vnd.android.package-archive'])
on conflict (id) do nothing;
-- Office staff can publish new app versions.
drop policy if exists downloads_office_write on storage.objects;
create policy downloads_office_write on storage.objects for insert to authenticated
  with check (bucket_id = 'downloads' and public.is_office());
drop policy if exists downloads_office_update on storage.objects;
create policy downloads_office_update on storage.objects for update to authenticated
  using (bucket_id = 'downloads' and public.is_office());
