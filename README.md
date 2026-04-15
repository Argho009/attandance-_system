# College Attendance Management System

A robust, multi-role web application designed for educational institutions to efficiently manage student attendance, academic marks, leave requests, timetable scheduling, and more. Built with React, Vite, Tailwind CSS, and powered by Supabase.

## 🌟 Key Features

### Multi-Role Architecture
The system supports four distinct user roles, each with specialized modules and access controls:
- **Admin:** Overall system configuration, user management, semester transitions, and bulk data uploads.
- **HOD (Head of Department):** Department-level analytics, leave/condonation approvals, timetable management, and notice distribution.
- **Teacher:** Mark attendance (including multi-class and borrowed lectures), process condonation requests, and view historical attendance data.
- **Student:** View personal attendance records, academic marks, request condonations, and access end-semester submissions.

### Advanced Modules
- **Attendance & Condonation Workflow:** Complete tracking of daily attendance with a dedicated multi-stage condonation request process.
- **OCR Integration:** Built-in support for processing schedules and documents via Tesseract.js.
- **Data Import/Export:** Bulk upload and management capabilities via CSV parsing (using PapaParse) and file saving exports.
- **Analytics & Reporting:** Visual insights via Recharts for quick administrative analysis and oversight.
- **Real-time Notifications:** In-app notifications using React Hot Toast and notice boards to keep all entities aligned.

## 🛠 Tech Stack
- **Frontend:** React 19, React Router DOM, Tailwind CSS
- **Build Tool:** Vite
- **Backend/Database:** Supabase (PostgreSQL, Authentication)

---

## 📝 Compliance & Implementation Specification Checklist

The following is an exact specification tracking list to determine full compliance.
_Status: `[x]` = Implemented (IS) | `[ ]` = Pending/In-Progress (IS NOT)_

### Environment & Deployment
- [x] Frontend: React + Vite + Tailwind CSS
- [x] Backend: Supabase (PostgreSQL + Auth + Storage + RLS)
- [ ] Deployment: Cloudflare Pages (free tier) with `_redirects` file
- [x] UI Style: Clean, professional, minimal animations, proper colors.
- [x] Supabase: RLS enabled on every table. Storage buckets created.

### User Roles & Auth
- [x] 4 Roles: Admin, HOD, Teacher, Student
- [x] Login with college_id + password
- [ ] Auth trigger sets app_metadata.role in JWT
- [ ] Student/Teacher/HOD can change own password, Admin resets.
- [ ] Admin "Download Login Credentials (Excel)" with specific label.

### Database Schema
- [x] `branches` table
- [x] `users` table
- [x] `students` table
- [x] `subjects` table
- [x] `subject_assignments` table
- [x] `lectures` table
- [x] `attendance` table with `blank_means`
- [x] `attendance_change_requests` table
- [x] `attendance_condonation` table
- [x] `ct_marks` table
- [x] `endsem_marks` table
- [x] `holidays` table
- [x] `timetable` table
- [x] `timetable_change_log` table
- [x] `substitute_log` table
- [x] `leave_requests` table
- [x] `notices` table
- [x] `assignment_submissions` table
- [x] `bulk_upload_logs` table
- [x] `semester_transitions` table
- [x] `system_config` table
- [x] Indexes implemented

### Row Level Security (RLS)
- [ ] USERS: Select own, Admin full.
- [ ] BRANCHES: Select all, Admin modify.
- [ ] STUDENTS: Student select own, Teacher/HOD/Admin select all, Admin modify.
- [ ] ATTENDANCE/LECTURES/MARKS/ETC: 100% strict constraints applied.
- [ ] TEACHER 3-DAY EDIT WINDOW enforced via RLS.

### Advanced Logic & Workflows
- [ ] Raw % vs Final % formulas exactly matched and capped at 100%.
- [ ] Low Attendance Alert directly computed on student dash & HOD view.
- [ ] Blank cell toggle handled correctly during Excel/CSV upload.
- [ ] OCR Beta photo processing (Tesseract.js).
- [ ] Condonation Flows: Student->Teacher->HOD and Teacher->HOD.

### Admin Pages
- [ ] User Management Page
- [ ] Bulk Role Upload Page
- [ ] CT Marks Upload Page
- [ ] Timetable Management Page
- [ ] Semester Transition Page
- [ ] System Config Page
- [ ] Subject Management Page

### HOD Pages
- [ ] Attendance Overview Page
- [ ] Marks Analysis Page
- [ ] Holiday Management Page
- [ ] End Sem Poll Page
- [ ] Subject and Teacher Assignment Page
- [ ] Leave Management Page
- [ ] Condonation Approval Page
- [ ] Attendance Change Requests Page
- [ ] Timetable Edit Page

### Teacher Pages
- [ ] Teacher Dashboard (Give Lecture workflow)
- [ ] Mark Attendance Page (5 tabs: Manual, Upload, Copy, Borrow, Photo)
- [ ] Attendance History Page
- [ ] Multi-Class Attendance Page
- [ ] Borrow / Reference Lecture Page
- [ ] Leave Request Page
- [ ] Condonation Request Page
- [ ] Notice Board Page

### Student Pages
- [ ] My Attendance Page
- [ ] My Marks Page
- [ ] End Sem Submission Page
- [ ] Condonation Request Page
- [ ] Profile Page

### Shared UI Components
- [ ] Pinboard component with Timetable Grid and Notice Board.
- [ ] "Total Lectures Held" explicitly shown per subject.

---
*End of Specification Checklist*
