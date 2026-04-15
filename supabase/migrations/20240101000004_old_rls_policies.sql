-- Enable RLS on all tables
alter table users enable row level security;
alter table branches enable row level security;
alter table students enable row level security;
alter table subjects enable row level security;
alter table subject_assignments enable row level security;
alter table lectures enable row level security;
alter table attendance enable row level security;
alter table attendance_change_requests enable row level security;
alter table attendance_condonation enable row level security;
alter table ct_marks enable row level security;
alter table endsem_marks enable row level security;
alter table holidays enable row level security;
alter table timetable enable row level security;
alter table timetable_change_log enable row level security;
alter table substitute_log enable row level security;
alter table leave_requests enable row level security;
alter table notices enable row level security;
alter table assignment_submissions enable row level security;
alter table bulk_upload_logs enable row level security;
alter table semester_transitions enable row level security;
alter table system_config enable row level security;

-- Policies for users
create policy "Users can view their own row" on users for select using (id = auth.uid());
create policy "Admin can view all users" on users for select using (auth.jwt()->>'role' = 'admin');
create policy "Admin can insert users" on users for insert with check (auth.jwt()->>'role' = 'admin');
create policy "Admin can update users" on users for update using (auth.jwt()->>'role' = 'admin');
create policy "Admin can delete users" on users for delete using (auth.jwt()->>'role' = 'admin');

-- Policies for branches
create policy "Anyone can view branches" on branches for select using (true);
create policy "Admin can insert branches" on branches for insert with check (auth.jwt()->>'role' = 'admin');
create policy "Admin can update branches" on branches for update using (auth.jwt()->>'role' = 'admin');
create policy "Admin can delete branches" on branches for delete using (auth.jwt()->>'role' = 'admin');

-- Policies for students
create policy "Students can view own row" on students for select using (user_id = auth.uid());
create policy "Teacher HOD Admin can view all students" on students for select using (auth.jwt()->>'role' in ('teacher', 'hod', 'admin'));
create policy "Admin can insert students" on students for insert with check (auth.jwt()->>'role' = 'admin');
create policy "Admin can update students" on students for update using (auth.jwt()->>'role' = 'admin');
create policy "Admin can delete students" on students for delete using (auth.jwt()->>'role' = 'admin');

-- Policies for attendance
create policy "Students can view own attendance" on attendance for select using (auth.jwt()->>'role' = 'student' and student_id in (select id from students where user_id = auth.uid()));
create policy "Teachers can view all attendance" on attendance for select using (auth.jwt()->>'role' in ('teacher', 'hod', 'admin'));
create policy "Teachers can insert own lectures attendance" on attendance for insert with check (auth.jwt()->>'role' = 'teacher' and lecture_id in (select id from lectures where teacher_id = auth.uid()));
create policy "Teachers can update attendance within 3 days" on attendance for update using (
  auth.jwt()->>'role' = 'teacher' and 
  lecture_id in (select id from lectures where teacher_id = auth.uid() and current_date - date <= 3)
);
create policy "HOD can update any attendance at any time" on attendance for update using (auth.jwt()->>'role' = 'hod');
create policy "Admin can full access attendance" on attendance for all using (auth.jwt()->>'role' = 'admin');

-- Policies for attendance_change_requests
create policy "All roles can view attendance_change_requests" on attendance_change_requests for select using (true);
create policy "Any teacher can insert change requests" on attendance_change_requests for insert with check (auth.jwt()->>'role' = 'teacher');
create policy "Original teacher can update status" on attendance_change_requests for update using (
  auth.jwt()->>'role' = 'teacher' and 
  lecture_id in (select id from lectures where teacher_id = auth.uid())
);
create policy "HOD can update status" on attendance_change_requests for update using (auth.jwt()->>'role' = 'hod');
create policy "Admin can full access attendance_change_requests" on attendance_change_requests for all using (auth.jwt()->>'role' = 'admin');

-- Policies for attendance_condonation
create policy "All roles can select attendance_condonation" on attendance_condonation for select using (true);
create policy "Student or Teacher can insert condonation" on attendance_condonation for insert with check (auth.jwt()->>'role' in ('student', 'teacher'));
create policy "Teacher can update confirming field" on attendance_condonation for update using (auth.jwt()->>'role' = 'teacher');
create policy "HOD can update approved and status" on attendance_condonation for update using (auth.jwt()->>'role' = 'hod');
create policy "Admin can full access condonation" on attendance_condonation for all using (auth.jwt()->>'role' = 'admin');

-- Policies for holidays
create policy "All roles can select holidays" on holidays for select using (true);
create policy "HOD can insert holiday" on holidays for insert with check (auth.jwt()->>'role' = 'hod');
create policy "Admin can insert update delete holidays" on holidays for all using (auth.jwt()->>'role' = 'admin');

-- Policies for leave_requests
create policy "All roles can select leave requests" on leave_requests for select using (true);
create policy "Teacher can insert own requests" on leave_requests for insert with check (auth.jwt()->>'role' = 'teacher' and teacher_id = auth.uid());
create policy "HOD can update leave requests" on leave_requests for update using (auth.jwt()->>'role' = 'hod');
create policy "Admin can full access leave requests" on leave_requests for all using (auth.jwt()->>'role' = 'admin');

-- Policies for ct_marks
create policy "Student can view own CT marks" on ct_marks for select using (auth.jwt()->>'role' = 'student' and student_id in (select id from students where user_id = auth.uid()));
create policy "Teacher can insert ct marks" on ct_marks for insert with check (auth.jwt()->>'role' = 'teacher');
create policy "Teacher view all ct marks" on ct_marks for select using (auth.jwt()->>'role' in ('teacher', 'hod', 'admin'));
create policy "HOD Admin full access ct marks" on ct_marks for all using (auth.jwt()->>'role' in ('hod', 'admin'));

-- Policies for endsem_marks
create policy "Student can insert endsem marks if poll open" on endsem_marks for insert with check (auth.jwt()->>'role' = 'student' and poll_open = true);
create policy "Student can view own endsem marks" on endsem_marks for select using (auth.jwt()->>'role' = 'student' and student_id in (select id from students where user_id = auth.uid()));
create policy "HOD can update locked and poll_open" on endsem_marks for update using (auth.jwt()->>'role' = 'hod');
create policy "HOD Admin full access endsem_marks" on endsem_marks for all using (auth.jwt()->>'role' in ('hod', 'admin'));
create policy "Teacher can select endsem marks" on endsem_marks for select using (auth.jwt()->>'role' = 'teacher');

-- Policies for notices
create policy "All logged in can select active notices" on notices for select using (is_active = true or auth.jwt()->>'role' in ('teacher', 'hod', 'admin'));
create policy "Teacher can update delete own notices" on notices for update using (auth.jwt()->>'role' = 'teacher' and posted_by = auth.uid());
create policy "Teacher can delete own notices" on notices for delete using (auth.jwt()->>'role' = 'teacher' and posted_by = auth.uid());
create policy "Teacher can insert notices" on notices for insert with check (auth.jwt()->>'role' = 'teacher');
create policy "HOD can update delete any notice" on notices for update using (auth.jwt()->>'role' = 'hod');
create policy "HOD can delete any notice" on notices for delete using (auth.jwt()->>'role' = 'hod');
create policy "HOD can insert notices" on notices for insert with check (auth.jwt()->>'role' = 'hod');
create policy "Admin full access notices" on notices for all using (auth.jwt()->>'role' = 'admin');

-- Policies for system_config
create policy "All roles select system config" on system_config for select using (true);
create policy "HOD can update system config" on system_config for update using (auth.jwt()->>'role' = 'hod');
create policy "Admin full access system config" on system_config for all using (auth.jwt()->>'role' = 'admin');

-- Policies for substitute_log
create policy "All roles select substitute_log" on substitute_log for select using (true);
create policy "Teacher insert substitute log" on substitute_log for insert with check (auth.jwt()->>'role' = 'teacher');
create policy "Teacher update own substitute status" on substitute_log for update using (auth.jwt()->>'role' = 'teacher');
create policy "HOD Admin full access substitute_log" on substitute_log for all using (auth.jwt()->>'role' in ('hod', 'admin'));

-- Default for other tables for completeness to not leave them inaccessible
create policy "Allow select on subjects" on subjects for select using (true);
create policy "Admin full access subjects" on subjects for all using (auth.jwt()->>'role' = 'admin');
create policy "HOD full access subjects" on subjects for all using (auth.jwt()->>'role' = 'hod');

create policy "Allow select on subject_assignments" on subject_assignments for select using (true);
create policy "Admin full access subject_assignments" on subject_assignments for all using (auth.jwt()->>'role' = 'admin');
create policy "HOD full access subject_assignments" on subject_assignments for all using (auth.jwt()->>'role' = 'hod');

create policy "Allow select on lectures" on lectures for select using (true);
create policy "Teacher insert lectures" on lectures for insert with check (auth.jwt()->>'role' = 'teacher');
create policy "Teacher update own lectures" on lectures for update using (auth.jwt()->>'role' = 'teacher' and teacher_id = auth.uid());
create policy "HOD Admin full access lectures" on lectures for all using (auth.jwt()->>'role' in ('hod', 'admin'));

create policy "Allow select on timetable" on timetable for select using (true);
create policy "Teacher update timetable" on timetable for update using (auth.jwt()->>'role' = 'teacher');
create policy "HOD Admin full access timetable" on timetable for all using (auth.jwt()->>'role' in ('hod', 'admin'));

create policy "Allow select on timetable_change_log" on timetable_change_log for select using (true);
create policy "Admin HOD Teacher insert log" on timetable_change_log for insert with check (auth.jwt()->>'role' in ('teacher', 'hod', 'admin'));

create policy "Allow select on assignment_submissions" on assignment_submissions for select using (true);
create policy "Student insert update submission" on assignment_submissions for insert with check (auth.jwt()->>'role' = 'student');
create policy "Student update own submission" on assignment_submissions for update using (auth.jwt()->>'role' = 'student');
create policy "Teacher HOD Admin full access submissions" on assignment_submissions for all using (auth.jwt()->>'role' in ('teacher', 'hod', 'admin'));

create policy "Allow select on bulk_upload_logs" on bulk_upload_logs for select using (true);
create policy "Admin insert upload logs" on bulk_upload_logs for insert with check (auth.jwt()->>'role' = 'admin');
create policy "Admin full access upload logs" on bulk_upload_logs for all using (auth.jwt()->>'role' = 'admin');

create policy "Allow select on semester_transitions" on semester_transitions for select using (true);
create policy "Admin insert update transitions" on semester_transitions for all using (auth.jwt()->>'role' = 'admin');
