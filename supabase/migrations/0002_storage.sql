-- Private bucket for listing photos and videos. Guarded so it is skipped where Supabase Storage is absent.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('listing-media', 'listing-media', false, 10485760)      -- 10MB, matches listing_media check
    on conflict (id) do nothing;

    -- Sellers may upload only into their own folder: <user id>/<file>
    create policy "sellers upload own folder" on storage.objects for insert to authenticated
      with check (bucket_id = 'listing-media' and (storage.foldername(name))[1] = auth.uid()::text);
    create policy "sellers read own files" on storage.objects for select to authenticated
      using (bucket_id = 'listing-media' and (storage.foldername(name))[1] = auth.uid()::text);
    -- Admins and the edit page get files through short-lived signed URLs made on the server.
  end if;
end $$;
