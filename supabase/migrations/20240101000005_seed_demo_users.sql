DO $$
DECLARE
    admin_uid UUID := gen_random_uuid();
    teacher_uid UUID := gen_random_uuid();
    student_uid UUID := gen_random_uuid();
    student_record_id UUID := gen_random_uuid();
    branch_id UUID := gen_random_uuid();
BEGIN
    -- 1. Insert Admin
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin111@college.edu') THEN
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            admin_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
            'admin111@college.edu', crypt('123', gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', '{"name":"Admin Demo"}', now(), now()
        );
        INSERT INTO public.users (id, college_id, name, role) 
        VALUES (admin_uid, 'admin111', 'Admin Demo', 'admin')
        ON CONFLICT (college_id) DO NOTHING;
    END IF;

    -- 2. Insert Teacher
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'teacher111@college.edu') THEN
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            teacher_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
            'teacher111@college.edu', crypt('123', gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', '{"name":"Teacher Demo"}', now(), now()
        );
        INSERT INTO public.users (id, college_id, name, role) 
        VALUES (teacher_uid, 'teacher111', 'Teacher Demo', 'teacher')
        ON CONFLICT (college_id) DO NOTHING;
    END IF;

    -- 3. Insert Student
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student111@college.edu') THEN
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            student_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
            'student111@college.edu', crypt('123', gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', '{"name":"Student Demo"}', now(), now()
        );
        INSERT INTO public.users (id, college_id, name, role) 
        VALUES (student_uid, 'student111', 'Student Demo', 'student')
        ON CONFLICT (college_id) DO NOTHING;

        -- Ensure there's a branch to attach the student to. Let's create 'AIML' if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM public.branches WHERE name = 'AIML') THEN
            INSERT INTO public.branches (id, name, created_by) VALUES (branch_id, 'AIML', admin_uid);
        END IF;

        -- Create student record
        INSERT INTO public.students (id, user_id, roll_no, branch, sem)
        VALUES (student_record_id, student_uid, 'STU111', 'AIML', 4)
        ON CONFLICT (roll_no) DO NOTHING;
    END IF;
END $$;
