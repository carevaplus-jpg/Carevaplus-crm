-- Applied to the Careva+ Supabase project as migration "careva_ai_media_bucket".
-- Public storage bucket for pictures and videos made by the careva-ai-media function. Files live under
-- <userId>/<random uuid>.<ext>, so links are unguessable; only the function (service role) can upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ai-media', 'ai-media', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
on conflict do nothing;
