-- Denarius — private profile avatars.

alter table public.app_user
  add column avatar_path text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-avatars',
  'profile-avatars',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- The server action uses the service role for the upload, but these policies
-- keep the bucket safe if a future browser path is added. A user can only read,
-- insert, update, or delete objects below their own UUID prefix.
create policy profile_avatars_select_own
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and name like (auth.uid()::text || '/%')
  );

create policy profile_avatars_insert_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and name like (auth.uid()::text || '/%')
  );

create policy profile_avatars_update_own
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and name like (auth.uid()::text || '/%')
  )
  with check (
    bucket_id = 'profile-avatars'
    and name like (auth.uid()::text || '/%')
  );

create policy profile_avatars_delete_own
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and name like (auth.uid()::text || '/%')
  );
