-- Storage bucket creation commands for Supabase
-- attendance-photos
insert into storage.buckets (id, name, public) values ('attendance-photos', 'attendance-photos', false);
create policy "attendance-photos access" on storage.objects for all using (bucket_id = 'attendance-photos' and auth.role() = 'authenticated');

-- upload-files
insert into storage.buckets (id, name, public) values ('upload-files', 'upload-files', false);
create policy "upload-files access" on storage.objects for all using (bucket_id = 'upload-files' and auth.role() = 'authenticated');

-- timetable-images
insert into storage.buckets (id, name, public) values ('timetable-images', 'timetable-images', false);
create policy "timetable-images access" on storage.objects for all using (bucket_id = 'timetable-images' and auth.role() = 'authenticated');
