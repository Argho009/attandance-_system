-- ═══════════════════════════════════════════════════════════════
-- CUSTOM JWT TRIGGER FOR ROLE
-- ═══════════════════════════════════════════════════════════════

-- Create a function to set custom claims in JWT
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
  DECLARE
    claims jsonb;
    user_role text;
  BEGIN
    -- Look up the user's role from the public.users table using the auth.uid()
    SELECT role INTO user_role FROM public.users WHERE id = (event->>'user_id')::uuid;

    claims := event->'claims';
    IF user_role IS NOT NULL THEN
      -- Set the role in app_metadata
      claims := jsonb_set(claims, '{app_metadata, role}', to_jsonb(user_role));
    END IF;

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
  END;
$$;

-- Note: To fully bind this hook, it usually is assigned in Supabase Auth Settings 
-- under "Custom Access Token (JWT) Hook", returning jsonb.
-- However, we can also use a trigger on auth.users for new signups to sync to public.users if desired.

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — ALL POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_condonation ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE endsem_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE substitute_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_upload_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────
-- USERS table
-- ─────────────────────────────────────────
CREATE POLICY "All roles: SELECT own row" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admin: full access to all rows" ON users FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- ─────────────────────────────────────────
-- BRANCHES table
-- ─────────────────────────────────────────
CREATE POLICY "All roles: SELECT" ON branches FOR SELECT USING (true);
CREATE POLICY "Admin: INSERT, UPDATE, DELETE" ON branches FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- ─────────────────────────────────────────
-- STUDENTS table
-- ─────────────────────────────────────────
CREATE POLICY "Student: SELECT only own row" ON students FOR SELECT USING (auth.jwt()->>'role' = 'student' AND user_id = auth.uid());
CREATE POLICY "Teacher, HOD, Admin: SELECT all" ON students FOR SELECT USING (auth.jwt()->>'role' IN ('teacher', 'hod', 'admin'));
CREATE POLICY "Admin: INSERT, UPDATE, DELETE" ON students FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- ─────────────────────────────────────────
-- ATTENDANCE table
-- ─────────────────────────────────────────
-- Note: 'student_id' points to students table. We need a way to link to auth.uid() for students.
CREATE POLICY "Student: SELECT only own rows" ON attendance FOR SELECT USING (
  auth.jwt()->>'role' = 'student' AND student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY "Teacher: SELECT own lectures" ON attendance FOR SELECT USING (
  auth.jwt()->>'role' = 'teacher'
);
CREATE POLICY "Teacher: INSERT for own lectures only" ON attendance FOR INSERT WITH CHECK (
  auth.jwt()->>'role' = 'teacher' AND marked_by = auth.uid()
);
CREATE POLICY "Teacher: UPDATE strictly within 3 days" ON attendance FOR UPDATE USING (
  auth.jwt()->>'role' = 'teacher' AND 
  marked_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM lectures 
    WHERE lectures.id = attendance.lecture_id AND lectures.date >= current_date - interval '3 days'
  )
);
CREATE POLICY "HOD: SELECT any" ON attendance FOR SELECT USING (auth.jwt()->>'role' = 'hod');
CREATE POLICY "HOD: UPDATE any row at any time" ON attendance FOR UPDATE USING (auth.jwt()->>'role' = 'hod');
CREATE POLICY "Admin: full access" ON attendance FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- ─────────────────────────────────────────
-- ATTENDANCE_CHANGE_REQUESTS table
-- ─────────────────────────────────────────
CREATE POLICY "All roles: SELECT" ON attendance_change_requests FOR SELECT USING (true);
CREATE POLICY "Any teacher: INSERT" ON attendance_change_requests FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'teacher');
CREATE POLICY "HOD: UPDATE status" ON attendance_change_requests FOR UPDATE USING (auth.jwt()->>'role' = 'hod');
CREATE POLICY "Original Teacher: UPDATE status" ON attendance_change_requests FOR UPDATE USING (
  auth.jwt()->>'role' = 'teacher' AND EXISTS (
    SELECT 1 FROM lectures WHERE lectures.id = attendance_change_requests.lecture_id AND lectures.teacher_id = auth.uid()
  )
);

-- ─────────────────────────────────────────
-- ATTENDANCE_CONDONATION table
-- ─────────────────────────────────────────
CREATE POLICY "All roles: SELECT" ON attendance_condonation FOR SELECT USING (true);
CREATE POLICY "Student or Teacher: INSERT" ON attendance_condonation FOR INSERT WITH CHECK (auth.jwt()->>'role' IN ('student', 'teacher'));
CREATE POLICY "Teacher: UPDATE teacher_confirmed_by" ON attendance_condonation FOR UPDATE USING (auth.jwt()->>'role' = 'teacher');
CREATE POLICY "HOD: UPDATE approved_by" ON attendance_condonation FOR UPDATE USING (auth.jwt()->>'role' = 'hod');
CREATE POLICY "Admin: full access" ON attendance_condonation FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- ─────────────────────────────────────────
-- HOLIDAYS table
-- ─────────────────────────────────────────
CREATE POLICY "All roles: SELECT" ON holidays FOR SELECT USING (true);
CREATE POLICY "HOD: INSERT only" ON holidays FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'hod');
-- HOD cannot UPDATE or DELETE by omission (no policies created for those actions for HOD)
CREATE POLICY "Admin: full access" ON holidays FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- ─────────────────────────────────────────
-- LEAVE_REQUESTS table
-- ─────────────────────────────────────────
CREATE POLICY "All roles: SELECT" ON leave_requests FOR SELECT USING (true);
CREATE POLICY "Teacher: INSERT own" ON leave_requests FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'teacher' AND teacher_id = auth.uid());
CREATE POLICY "HOD: UPDATE status" ON leave_requests FOR UPDATE USING (auth.jwt()->>'role' = 'hod');
CREATE POLICY "Admin: full access" ON leave_requests FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- ─────────────────────────────────────────
-- CT_MARKS table
-- ─────────────────────────────────────────
CREATE POLICY "Student: SELECT own rows" ON ct_marks FOR SELECT USING (
  auth.jwt()->>'role' = 'student' AND student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY "Teacher: SELECT subjects" ON ct_marks FOR SELECT USING (auth.jwt()->>'role' = 'teacher');
CREATE POLICY "HOD, Admin: SELECT" ON ct_marks FOR SELECT USING (auth.jwt()->>'role' IN ('hod', 'admin'));

CREATE POLICY "Teacher: INSERT for assigned subjects" ON ct_marks FOR INSERT WITH CHECK (
  auth.jwt()->>'role' = 'teacher' AND EXISTS (
    SELECT 1 FROM subject_assignments WHERE subject_assignments.subject_id = ct_marks.subject_id AND subject_assignments.teacher_id = auth.uid()
  )
);
CREATE POLICY "HOD, Admin: UPDATE, DELETE" ON ct_marks FOR ALL USING (auth.jwt()->>'role' IN ('hod', 'admin'));

-- ─────────────────────────────────────────
-- ENDSEM_MARKS table
-- ─────────────────────────────────────────
CREATE POLICY "Student: SELECT own rows" ON endsem_marks FOR SELECT USING (
  auth.jwt()->>'role' = 'student' AND student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY "Student: INSERT when poll_open" ON endsem_marks FOR INSERT WITH CHECK (
  auth.jwt()->>'role' = 'student' AND poll_open = true AND NOT is_locked AND student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY "HOD: UPDATE is_locked and poll_open" ON endsem_marks FOR UPDATE USING (auth.jwt()->>'role' = 'hod');
CREATE POLICY "Admin: full access" ON endsem_marks FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- ─────────────────────────────────────────
-- NOTICES table
-- ─────────────────────────────────────────
CREATE POLICY "All logged-in users: SELECT active" ON notices FOR SELECT USING (is_active = true);
CREATE POLICY "Teacher: UPDATE and DELETE own notices" ON notices FOR ALL USING (auth.jwt()->>'role' = 'teacher' AND posted_by = auth.uid());
CREATE POLICY "HOD: UPDATE and DELETE any notice" ON notices FOR ALL USING (auth.jwt()->>'role' = 'hod');
CREATE POLICY "Admin: full access" ON notices FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- ─────────────────────────────────────────
-- SYSTEM_CONFIG table
-- ─────────────────────────────────────────
CREATE POLICY "All roles: SELECT" ON system_config FOR SELECT USING (true);
CREATE POLICY "HOD: UPDATE lectures_per_day only" ON system_config FOR UPDATE USING (
  auth.jwt()->>'role' = 'hod' AND key = 'lectures_per_day'
);
CREATE POLICY "Admin: full access" ON system_config FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- ─────────────────────────────────────────
-- SUBSTITUTE_LOG table
-- ─────────────────────────────────────────
CREATE POLICY "All roles: SELECT" ON substitute_log FOR SELECT USING (true);
CREATE POLICY "Teacher: UPDATE own row" ON substitute_log FOR UPDATE USING (
  auth.jwt()->>'role' = 'teacher' AND substitute_teacher_id = auth.uid()
);
CREATE POLICY "HOD, Admin: full access" ON substitute_log FOR ALL USING (auth.jwt()->>'role' IN ('hod', 'admin'));
