-- Private storage bucket for uploaded medical reports.
-- Files are namespaced per user: reports/<user_id>/<uuid>-<filename>

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

-- Each policy below restricts access to the folder named after the user's id
-- (the first path segment), so users can only touch their own files.
create policy "reports bucket: read own"
  on storage.objects for select
  using (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "reports bucket: insert own"
  on storage.objects for insert
  with check (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "reports bucket: update own"
  on storage.objects for update
  using (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "reports bucket: delete own"
  on storage.objects for delete
  using (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);
