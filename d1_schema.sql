-- CAMS: Cloudflare D1 (SQLite) Schema
-- Run: npx wrangler d1 execute cams-db --remote --file=./d1_schema.sql

CREATE TABLE IF NOT EXISTS users (
  id               TEXT PRIMARY KEY,
  college_id       TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  role             TEXT CHECK (role IN ('admin','hod','teacher','student')) NOT NULL,
  password_hash    TEXT NOT NULL,
  initial_password TEXT,
  is_active        INTEGER DEFAULT 1,
  deleted_at       TEXT DEFAULT NULL,
  created_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS branches (
  id         TEXT PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS students (
  id      TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  roll_no TEXT UNIQUE NOT NULL,
  branch  TEXT NOT NULL,
  sem     INTEGER CHECK (sem BETWEEN 1 AND 8) NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  code       TEXT UNIQUE NOT NULL,
  sem        INTEGER NOT NULL,
  branch     TEXT NOT NULL,
  credits    INTEGER DEFAULT 3,
  type       TEXT DEFAULT 'theory',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subject_assignments (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id    TEXT REFERENCES users(id),
  academic_year TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(subject_id, academic_year)
);

CREATE TABLE IF NOT EXISTS lectures (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT REFERENCES subjects(id),
  teacher_id    TEXT REFERENCES users(id),
  date          TEXT NOT NULL,
  lecture_no    INTEGER CHECK (lecture_no BETWEEN 1 AND 8) NOT NULL,
  is_skipped    INTEGER DEFAULT 0,
  skip_reason   TEXT,
  academic_year TEXT NOT NULL,
  sem           INTEGER NOT NULL,
  blank_means   TEXT DEFAULT 'absent',
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendance (
  id              TEXT PRIMARY KEY,
  lecture_id      TEXT REFERENCES lectures(id) ON DELETE CASCADE,
  student_id      TEXT REFERENCES students(id),
  status          TEXT CHECK (status IN ('present','absent')) NOT NULL,
  remarks         TEXT,
  marked_by       TEXT REFERENCES users(id),
  edited_by       TEXT REFERENCES users(id),
  original_status TEXT,
  edited_at       TEXT,
  academic_year   TEXT NOT NULL,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendance_condonation (
  id                   TEXT PRIMARY KEY,
  student_id           TEXT REFERENCES students(id),
  subject_id           TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  lectures_condoned     INTEGER NOT NULL,
  reason               TEXT NOT NULL,
  document_url         TEXT,
  requested_by         TEXT REFERENCES users(id),
  teacher_confirmed_by TEXT REFERENCES users(id),
  approved_by          TEXT REFERENCES users(id),
  status               TEXT CHECK (status IN ('pending','teacher_review','approved','rejected')) DEFAULT 'pending',
  academic_year        TEXT NOT NULL,
  sem                  INTEGER NOT NULL,
  created_at           TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendance_change_requests (
  id               TEXT PRIMARY KEY,
  lecture_id       TEXT REFERENCES lectures(id),
  requested_by     TEXT REFERENCES users(id),
  student_id       TEXT REFERENCES students(id),
  requested_status TEXT CHECK (requested_status IN ('present','absent')),
  reason           TEXT,
  status           TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  reviewed_by      TEXT REFERENCES users(id),
  reviewed_at      TEXT,
  created_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ct_marks (
  id             TEXT PRIMARY KEY,
  student_id     TEXT REFERENCES students(id),
  subject_id     TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  test_name      TEXT NOT NULL,
  marks_obtained REAL,
  max_marks      REAL NOT NULL,
  uploaded_by    TEXT REFERENCES users(id),
  academic_year  TEXT NOT NULL,
  created_at     TEXT DEFAULT (datetime('now')),
  UNIQUE(student_id, subject_id, test_name, academic_year)
);

CREATE TABLE IF NOT EXISTS endsem_marks (
  id            TEXT PRIMARY KEY,
  student_id    TEXT REFERENCES students(id),
  subject_id    TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  sem           INTEGER NOT NULL,
  marks         REAL,
  submitted_by  TEXT REFERENCES users(id),
  verified_by   TEXT REFERENCES users(id),
  is_locked     INTEGER DEFAULT 0,
  poll_open     INTEGER DEFAULT 0,
  academic_year TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS holidays (
  id         TEXT PRIMARY KEY,
  date       TEXT UNIQUE NOT NULL,
  reason     TEXT NOT NULL,
  added_by   TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS timetable (
  id          TEXT PRIMARY KEY,
  branch      TEXT NOT NULL,
  sem         INTEGER NOT NULL,
  day_of_week TEXT CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')) NOT NULL,
  lecture_no  INTEGER CHECK (lecture_no BETWEEN 1 AND 8) NOT NULL,
  subject_id  TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id  TEXT REFERENCES users(id),
  room        TEXT,
  edited_by   TEXT REFERENCES users(id),
  edited_at   TEXT,
  UNIQUE(branch, sem, day_of_week, lecture_no)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id                   TEXT PRIMARY KEY,
  teacher_id           TEXT REFERENCES users(id),
  date                 TEXT NOT NULL,
  type                 TEXT CHECK (type IN ('planned','emergency')) NOT NULL,
  reason               TEXT,
  suggested_substitute TEXT REFERENCES users(id),
  status               TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  reviewed_by          TEXT REFERENCES users(id),
  reviewed_at          TEXT,
  created_at           TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS substitute_log (
  id                    TEXT PRIMARY KEY,
  timetable_id          TEXT REFERENCES timetable(id),
  date                  TEXT NOT NULL,
  original_teacher_id   TEXT REFERENCES users(id),
  substitute_teacher_id TEXT REFERENCES users(id),
  note                  TEXT,
  accepted_by           TEXT REFERENCES users(id),
  status                TEXT CHECK (status IN ('pending','accepted','rejected')) DEFAULT 'pending',
  created_at            TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notices (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT,
  type       TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  branch     TEXT,
  sem        INTEGER,
  due_date   TEXT,
  is_active  INTEGER DEFAULT 1,
  is_pinned  INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bulk_upload_logs (
  id          TEXT PRIMARY KEY,
  uploaded_by TEXT REFERENCES users(id),
  file_name   TEXT,
  type        TEXT,
  status      TEXT,
  errors_json TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS system_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO system_config (key, value) VALUES
  ('lectures_per_day', '8'),
  ('working_days_per_week', '6'),
  ('current_academic_year', '2024-25');

CREATE TABLE IF NOT EXISTS semester_summary (
  id               TEXT PRIMARY KEY,
  student_id       TEXT REFERENCES students(id),
  subject_id       TEXT REFERENCES subjects(id),
  sem              INTEGER NOT NULL,
  academic_year    TEXT NOT NULL,
  total_lectures   INTEGER NOT NULL,
  present          INTEGER NOT NULL,
  absent           INTEGER NOT NULL,
  condoned         INTEGER DEFAULT 0,
  raw_percent      REAL NOT NULL,
  final_percent    REAL NOT NULL,
  archived_at      TEXT DEFAULT (datetime('now')),
  archive_file_url TEXT,
  UNIQUE(student_id, subject_id, sem, academic_year)
);

CREATE TABLE IF NOT EXISTS archive_log (
  id             TEXT PRIMARY KEY,
  archived_by    TEXT REFERENCES users(id),
  branch         TEXT NOT NULL,
  sem            INTEGER NOT NULL,
  academic_year  TEXT NOT NULL,
  students_count INTEGER NOT NULL,
  subjects_count INTEGER NOT NULL,
  rows_archived  INTEGER NOT NULL,
  rows_deleted   INTEGER NOT NULL,
  file_name      TEXT,
  file_url       TEXT,
  status         TEXT CHECK (status IN ('completed','failed','partial')) DEFAULT 'completed',
  created_at     TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_lecture ON attendance(lecture_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_lectures_date      ON lectures(date);
CREATE INDEX IF NOT EXISTS idx_students_roll      ON students(roll_no);
CREATE INDEX IF NOT EXISTS idx_students_branch    ON students(branch, sem);
