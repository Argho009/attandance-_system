-- ╔══════════════════════════════════════════════════════════════════╗
-- ║     REPAIR: create_system_user RPC SIGNATURE (V2)                ║
-- ║     Logic: Default pass is last 5 digits of Roll No              ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.create_system_user(
  p_college_id TEXT,
  p_name       TEXT,
  p_role       TEXT,
  p_additional_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_user_id    UUID;
  encrypted_pw TEXT;
  final_email  TEXT;
  v_password   TEXT;
  v_roll_no    TEXT;
  v_branch     TEXT;
  v_sem        INTEGER;
BEGIN
  v_roll_no  := p_additional_data->>'roll_no';
  v_branch   := p_additional_data->>'branch';
  v_sem      := (p_additional_data->>'sem')::INTEGER;
  
  -- PASSWORD LOGIC: 
  -- 1. Use explicit password if provided
  -- 2. IF student, use last 5 digits of Roll No
  -- 3. Otherwise, use College ID
  v_password := p_additional_data->>'password';
  IF v_password IS NULL THEN
    IF p_role = 'student' AND v_roll_no IS NOT NULL THEN
      v_password := RIGHT(v_roll_no, 5);
    ELSE
      v_password := p_college_id;
    END IF;
  END IF;

  encrypted_pw := crypt(v_password, gen_salt('bf'));
  final_email  := CASE WHEN p_college_id LIKE '%@%' THEN p_college_id ELSE p_college_id || '@college.edu' END;

  -- Upsert logic
  SELECT id INTO v_user_id FROM auth.users WHERE email = final_email;

  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users SET encrypted_password = encrypted_pw, updated_at = now() WHERE id = v_user_id;
  ELSE
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', final_email, encrypted_pw, now(), 
    jsonb_build_object('provider','email','providers',array['email'],'role',p_role), jsonb_build_object('name', p_name), now(), now());
  END IF;

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (v_user_id, v_user_id, jsonb_build_object('sub', v_user_id, 'email', final_email), 'email', final_email, now(), now(), now())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.users (id, college_id, name, role, initial_password)
  VALUES (v_user_id, p_college_id, p_name, p_role, v_password)
  ON CONFLICT (college_id) DO UPDATE SET name = p_name, role = p_role, initial_password = v_password;

  IF p_role = 'student' AND v_roll_no IS NOT NULL THEN
    INSERT INTO public.students (user_id, roll_no, branch, sem)
    VALUES (v_user_id, v_roll_no, v_branch, v_sem)
    ON CONFLICT (user_id) DO UPDATE SET roll_no = v_roll_no, branch = v_branch, sem = v_sem;
  END IF;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
