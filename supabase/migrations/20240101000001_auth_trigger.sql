-- Create a custom trigger to copy the user's role from the public.users table into the auth.users app_metadata

-- First create the function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, college_id, name, role, is_active)
  values (new.id, new.email, new.raw_user_meta_data->>'name', 'student', true);
  return new;
end;
$$ language plpgsql security definer;

-- In this app it says: admin creates all accounts — no public registration ever.
-- So we probably just update the app_metadata on login or let the admin specify it.
-- We can add a function to sync role to app_metadata:
create or replace function public.sync_user_role()
returns trigger as $$
begin
  -- Update app_metadata.role in auth.users
  update auth.users
  set raw_app_meta_data = jsonb_set(
    coalesce(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(NEW.role)
  )
  where id = NEW.id;
  
  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger to run after insert or update on public.users
create trigger on_user_role_change
  after insert or update of role on public.users
  for each row execute function public.sync_user_role();
