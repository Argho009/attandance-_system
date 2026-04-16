DO $$
DECLARE
    admin_uid UUID;
    teacher_uid UUID;
    student_uid UUID;
    branch_id UUID := gen_random_uuid();
BEGIN
    -- 1. Get or Create Admin
    SELECT id INTO admin_uid FROM auth.users WHERE email = 'admin111@college.edu';
    IF admin_uid IS NULL THEN
        admin_uid := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (admin_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin111@college.edu', crypt('123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"admin"}', '{"name":"Admin Demo"}', now(), now());
    END IF;
    INSERT INTO public.users (id, college_id, name, role) VALUES (admin_uid, 'admin111', 'Admin Demo', 'admin') ON CONFLICT (id) DO UPDATE SET role = 'admin';

    -- 2. Get or Create Teacher
    SELECT id INTO teacher_uid FROM auth.users WHERE email = 'teacher111@college.edu';
    IF teacher_uid IS NULL THEN
        teacher_uid := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (teacher_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher111@college.edu', crypt('123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"teacher"}', '{"name":"Teacher Demo"}', now(), now());
    END IF;
    INSERT INTO public.users (id, college_id, name, role) VALUES (teacher_uid, 'teacher111', 'Teacher Demo', 'teacher') ON CONFLICT (id) DO UPDATE SET role = 'teacher';

    -- 3. Get or Create Student
    SELECT id INTO student_uid FROM auth.users WHERE email = 'student111@college.edu';
    IF student_uid IS NULL THEN
        student_uid := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (student_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student111@college.edu', crypt('123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"student"}', '{"name":"Student Demo"}', now(), now());
    END IF;
    INSERT INTO public.users (id, college_id, name, role) VALUES (student_uid, 'student111', 'Student Demo', 'student') ON CONFLICT (id) DO UPDATE SET role = 'student';

    -- Ensure branch and student record exists
    IF NOT EXISTS (SELECT 1 FROM public.branches WHERE name = 'AIML') THEN
        INSERT INTO public.branches (id, name, created_by) VALUES (branch_id, 'AIML', admin_uid);
    END IF;
    
    INSERT INTO public.students (user_id, roll_no, branch, sem)
    VALUES (student_uid, 'STU111', 'AIML', 4)
    ON CONFLICT (roll_no) DO NOTHING;

END $$;
