-- Lets a seller replace a file in their own DRAFT listing folder.
-- Why: a retry after a dropped connection uploads the same path again (upsert). Without this policy that retry fails.
-- Once the listing is submitted the files are locked: the policy only matches while the listing is a draft.
-- Object path layout: <seller_id>/<listing_id>/<file>. Guarded so it is skipped where Supabase Storage is absent.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    create policy media_update_own_draft on storage.objects for update to authenticated
      using (bucket_id in ('photos', 'videos')
             and (storage.foldername(name))[1] = auth.uid()::text
             and public.is_usable()
             and exists (select 1 from public.listings l
                         where l.id::text = (storage.foldername(name))[2]
                           and l.seller_id = auth.uid() and l.status = 'draft'))
      with check (bucket_id in ('photos', 'videos')
             and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;
