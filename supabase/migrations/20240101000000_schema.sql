-- ─────────────────────────────────────────
-- HELPERS
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION exec_sql(sql_query text) 
RETURNS void AS $$ 
BEGIN 
  EXECUTE sql_query; 
END; 
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────
-- BRANCHES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,  -- e.g. 'AI', 'AIML', 'CS'
  created_by uuid,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
create table users (
  id               uuid primary key default gen_random_uuid(),
  college_id       text unique not null,
  name             text not null,
  role             text check (role in ('admin','hod','teacher','student'))
                   not null,
  initial_password text,   -- stored only for admin credential download
  is_active        boolean default true,
  created_at       timestamptz default now()
);

-- Add fk from branches to users now that users exists
alter table branches add constraint branches_created_by_fkey foreign key (created_by) references users(id);

-- ─────────────────────────────────────────
-- STUDENTS (minimal fields only)
-- ─────────────────────────────────────────
create table students (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  roll_no text unique not null,
  branch  text not null,   -- must match a value in branches.name
  sem     integer check (sem between 1 and 8) not null
);

-- ─────────────────────────────────────────
-- SUBJECTS
-- ─────────────────────────────────────────
create table subjects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text unique not null,
  sem        integer not null,
  branch     text not null,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- SUBJECT ASSIGNMENTS
-- A teacher can be assigned to multiple subjects across
-- different branches and sems simultaneously.
-- ─────────────────────────────────────────
create table subject_assignments (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid references subjects(id) on delete cascade,
  teacher_id    uuid references users(id),
  academic_year text not null,   -- e.g. '2024-25'
  created_at    timestamptz default now(),
  unique(subject_id, academic_year)
);

-- ─────────────────────────────────────────
-- LECTURES
-- Numbered per-subject per-day. NOT globally.
-- ─────────────────────────────────────────
create table lectures (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid references subjects(id),
  teacher_id    uuid references users(id),
  date          date not null,
  lecture_no    integer check (lecture_no between 1 and 8) not null,
  is_skipped    boolean default false,
  skip_reason   text,
  academic_year text not null,
  sem           integer not null,
  blank_means   text check (blank_means in ('present','absent')) default 'absent',
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────
-- ATTENDANCE
-- ─────────────────────────────────────────
create table attendance (
  id              uuid primary key default gen_random_uuid(),
  lecture_id      uuid references lectures(id) on delete cascade,
  student_id      uuid references students(id),
  status          text check (status in ('present','absent')) not null,
  remarks         text,   -- e.g. 'arrived late', 'left early'
                          -- does NOT change present/absent status
  marked_by       uuid references users(id),
  edited_by       uuid references users(id),
  original_status text,
  edited_at       timestamptz,
  academic_year   text not null,
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────
-- ATTENDANCE CHANGE REQUESTS
-- ─────────────────────────────────────────
create table attendance_change_requests (
  id               uuid primary key default gen_random_uuid(),
  lecture_id       uuid references lectures(id),
  requested_by     uuid references users(id),
  student_id       uuid references students(id),
  requested_status text check (requested_status in ('present','absent')),
  reason           text,
  status           text check (status in ('pending','approved','rejected'))
                   default 'pending',
  reviewed_by      uuid references users(id),
  reviewed_at      timestamptz,
  created_at       timestamptz default now()
);

-- ─────────────────────────────────────────
-- ATTENDANCE CONDONATION
-- ─────────────────────────────────────────
create table attendance_condonation (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid references students(id),
  subject_id           uuid references subjects(id),
  lectures_condoned    integer not null,
  reason               text not null,
  document_url         text,   -- medical certificate (Supabase Storage)
  requested_by         uuid references users(id),   -- student or teacher
  teacher_confirmed_by uuid references users(id),   -- teacher validates if
                                                    -- student-initiated
  approved_by          uuid references users(id),   -- HOD final approval
  status               text check (status in (
                         'pending','teacher_review','approved','rejected'))
                         default 'pending',
  academic_year        text not null,
  sem                  integer not null,
  created_at           timestamptz default now()
);

-- ─────────────────────────────────────────
-- CT MARKS
-- ─────────────────────────────────────────
create table ct_marks (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid references students(id),
  subject_id      uuid references subjects(id),
  test_name       text not null,   -- 'CT1', 'CT2', or any custom name
  marks_obtained  numeric,
  max_marks       numeric not null,
  uploaded_by     uuid references users(id),
  academic_year   text not null,
  created_at      timestamptz default now(),
  unique(student_id, subject_id, test_name, academic_year)
);

-- ─────────────────────────────────────────
-- ENDSEM MARKS
-- ─────────────────────────────────────────
create table endsem_marks (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid references students(id),
  subject_id    uuid references subjects(id),
  sem           integer not null,
  marks         numeric,
  submitted_by  uuid references users(id),
  verified_by   uuid references users(id),
  is_locked     boolean default false,
  poll_open     boolean default false,
  academic_year text not null,
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────
-- HOLIDAYS
-- ─────────────────────────────────────────
create table holidays (
  id         uuid primary key default gen_random_uuid(),
  date       date unique not null,
  reason     text not null,
  added_by   uuid references users(id),
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- TIMETABLE
-- ─────────────────────────────────────────
create table timetable (
  id          uuid primary key default gen_random_uuid(),
  branch      text not null,
  sem         integer not null,
  day_of_week text check (day_of_week in (
                'Monday','Tuesday','Wednesday',
                'Thursday','Friday','Saturday')) not null,
  lecture_no  integer check (lecture_no between 1 and 8) not null,
  subject_id  uuid references subjects(id),
  room        text,
  edited_by   uuid references users(id),
  edited_at   timestamptz,
  unique(branch, sem, day_of_week, lecture_no)
);

-- ─────────────────────────────────────────
-- TIMETABLE CHANGE LOG
-- ─────────────────────────────────────────
create table timetable_change_log (
  id             uuid primary key default gen_random_uuid(),
  timetable_id   uuid references timetable(id),
  changed_by     uuid references users(id),
  old_subject_id uuid,
  new_subject_id uuid,
  old_room       text,
  new_room       text,
  changed_at     timestamptz default now()
);

-- ─────────────────────────────────────────
-- SUBSTITUTE LOG
-- ─────────────────────────────────────────
create table substitute_log (
  id                     uuid primary key default gen_random_uuid(),
  timetable_id           uuid references timetable(id),
  date                   date not null,
  original_teacher_id    uuid references users(id),
  substitute_teacher_id  uuid references users(id),
  note                   text,
  accepted_by            uuid references users(id),
  status                 text check (status in (
                           'pending','accepted','rejected'))
                           default 'pending',
  created_at             timestamptz default now()
);

-- ─────────────────────────────────────────
-- LEAVE REQUESTS
-- ─────────────────────────────────────────
create table leave_requests (
  id                   uuid primary key default gen_random_uuid(),
  teacher_id           uuid references users(id),
  date                 date not null,
  type                 text check (type in ('planned','emergency')) not null,
  reason               text,
  suggested_substitute uuid references users(id),   -- optional
  status               text check (status in (
                         'pending','approved','rejected'))
                         default 'pending',
  reviewed_by          uuid references users(id),
  reviewed_at          timestamptz,
  created_at           timestamptz default now()
);

-- ─────────────────────────────────────────
-- NOTICES
-- ─────────────────────────────────────────
create table notices (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  type       text check (type in ('assignment','lab','library','general'))
             not null,
  posted_by  uuid references users(id),
  subject_id uuid references subjects(id),
  branch     text,
  sem        integer,
  due_date   timestamptz,
  is_active  boolean default true,
  is_pinned  boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- ASSIGNMENT SUBMISSIONS
-- ─────────────────────────────────────────
create table assignment_submissions (
  id           uuid primary key default gen_random_uuid(),
  notice_id    uuid references notices(id) on delete cascade,
  student_id   uuid references students(id),
  submitted_at timestamptz default now(),
  file_url     text,
  remarks      text,
  status       text check (status in ('submitted','late','missing'))
               default 'missing'
);

-- ─────────────────────────────────────────
-- BULK UPLOAD LOGS
-- ─────────────────────────────────────────
create table bulk_upload_logs (
  id          uuid primary key default gen_random_uuid(),
  uploaded_by uuid references users(id),
  file_name   text,
  type        text check (type in ('roles','marks','attendance')),
  status      text check (status in ('success','partial','failed')),
  errors_json jsonb,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- SEMESTER TRANSITIONS
-- ─────────────────────────────────────────
create table semester_transitions (
  id                uuid primary key default gen_random_uuid(),
  triggered_by      uuid references users(id),
  branch            text,
  old_sem           integer,
  new_sem           integer,
  affected_students integer,
  created_at        timestamptz default now()
);

-- ─────────────────────────────────────────
-- SYSTEM CONFIG
-- ─────────────────────────────────────────
create table system_config (
  key        text primary key,
  value      text not null,
  updated_by uuid references users(id),
  updated_at timestamptz default now()
);

insert into system_config (key, value) values
  ('lectures_per_day', '8'),          -- HOD editable: range 4 to 8
  ('working_days_per_week', '6'),
  ('current_academic_year', '2024-25');

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
create index on attendance(lecture_id);
create index on attendance(student_id);
create index on attendance(academic_year);
create index on lectures(subject_id, date);
create index on lectures(academic_year);
create index on ct_marks(student_id, subject_id);
create index on students(branch, sem);
create index on leave_requests(teacher_id, status);
create index on attendance_condonation(student_id, subject_id);
