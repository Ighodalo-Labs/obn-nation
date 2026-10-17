-- Private buckets for listing media. Guarded so it is skipped where Supabase Storage is absent.
-- Object path layout (both buckets): <seller_id>/<listing_id>/<file>
--   photos: WebP, under 1MB each     videos: MP4, under 10MB, one per listing (optional)
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('photos', 'photos', false, 1048576,  array['image/webp']),
      ('videos', 'videos', false, 10485760, array['video/mp4'])
    on conflict (id) do nothing;

    -- Sellers upload only into their own folder.
    create policy media_insert_own on storage.objects for insert to authenticated
      with check (bucket_id in ('photos', 'videos')
                  and (storage.foldername(name))[1] = auth.uid()::text
                  and public.is_usable());

    -- Read: your own folder, or any file attached to a listing you are allowed to see.
    -- The subquery on public.listings runs with the caller's rights, so listing RLS decides.
    create policy media_select on storage.objects for select to authenticated
      using (bucket_id in ('photos', 'videos') and public.is_usable() and (
        (storage.foldername(name))[1] = auth.uid()::text
        or exists (select 1 from public.listings l
                   where (bucket_id = 'photos' and storage.objects.name = any (l.photo_urls))
                      or (bucket_id = 'videos' and storage.objects.name = l.video_url))));
    -- No update or delete policy for users. Cleanup runs on the server with service_role.
  end if;
end $$;
