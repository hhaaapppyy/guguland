-- Run once in the Supabase SQL Editor. No credentials belong in this file.
create table if not exists public.gugu_records (
  key text primary key,
  value jsonb not null
);
alter table public.gugu_records enable row level security;
revoke all on public.gugu_records from anon, authenticated;
grant all on public.gugu_records to service_role;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('gugu-media','gugu-media',false,12582912,
  array['image/png','image/jpeg','image/webp','audio/mpeg','audio/mp4','audio/wav','audio/x-wav','audio/ogg','audio/webm'])
on conflict (id) do nothing;
