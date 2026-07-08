-- Public bucket for product/court photos, path-scoped per user:
-- {user_id}/products/{filename} and {user_id}/courts/{filename}
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

create policy "images_public_read"
on storage.objects for select
using (bucket_id = 'images');

create policy "images_owner_insert"
on storage.objects for insert
with check (bucket_id = 'images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "images_owner_update"
on storage.objects for update
using (bucket_id = 'images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "images_owner_delete"
on storage.objects for delete
using (bucket_id = 'images' and auth.uid()::text = (storage.foldername(name))[1]);
