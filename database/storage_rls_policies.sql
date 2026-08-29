-- ============================================
-- STORAGE POLICIES for the "project-documents" bucket
-- Run this in Supabase SQL Editor.
-- ============================================

-- Allow any authenticated user to upload, but ONLY into their own folder
-- (matches your code's path pattern: `${user.id}/filename`)
create policy "Users can upload into their own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read/list files
-- (Your bucket is already marked "Public" so downloads via getPublicUrl work
--  regardless, but this covers authenticated API access too.)
create policy "Authenticated users can view documents"
on storage.objects for select
to authenticated
using (bucket_id = 'project-documents');

-- Allow a user to delete their own uploads, and admins to delete any
create policy "Users delete own files, admins delete any"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);
