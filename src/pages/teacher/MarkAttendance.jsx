import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toggle } from '../../components/ui/Toggle';
import { toast } from '../../components/ui/Toast';
import { CheckCircle, XCircle, Save } from 'lucide-react';

export const MarkAttendance = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1=select, 2=mark
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState({ subject_id: '', lecture_no: '', date: new Date().toISOString().split('T')[0], blank_means: 'absent' });
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [existing, setExisting] = useState(null); // existing lecture
  const [saving, setSaving] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    supabase
      .from('subject_assignments')
      .select('subject_id, subjects(id, code, name, sem, branch)')
      .eq('teacher_id', user.id)
      .then(({ data }) => setAssignments(data || []));
  }, [user]);

  const getSubjectInfo = () => assignments.find(a => a.subject_id === form.subject_id)?.subjects;

  const handleProceed = async () => {
    if (!form.subject_id || !form.lecture_no || !form.date) return toast.error('Fill all fields');
    const subject = getSubjectInfo();
    if (!subject) return;

    setLoadingStudents(true);

    // Check if lecture already exists
    const { data: existLec } = await supabase
      .from('lectures')
      .select('id, blank_means')
      .eq('subject_id', form.subject_id)
      .eq('date', form.date)
      .eq('lecture_no', parseInt(form.lecture_no))
      .single();

    // Get students for this branch/sem
    const { data: studs } = await supabase
      .from('students')
      .select('id, roll_no, users(name)')
      .eq('branch', subject.branch)
      .eq('sem', subject.sem)
      .order('roll_no');

    if (!studs?.length) {
      toast.error('No students found for this branch/sem');
      setLoadingStudents(false);
      return;
    }

    setStudents(studs);
    setExisting(existLec || null);

    if (existLec) {
      // Load existing attendance
      const { data: existAtt } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('lecture_id', existLec.id);

      const map = {};
      studs.forEach(s => { map[s.id] = existLec.blank_means === 'present' ? 'present' : 'absent'; });
      (existAtt || []).forEach(a => { map[a.student_id] = a.status; });
      setAttendance(map);
    } else {
      // Default all to absent (or present based on blank_means)
      const map = {};
      studs.forEach(s => { map[s.id] = form.blank_means === 'present' ? 'present' : 'absent'; });
      setAttendance(map);
    }

    setStep(2);
    setLoadingStudents(false);
  };

  const toggleStudent = (id) => {
    setAttendance(prev => ({ ...prev, [id]: prev[id] === 'present' ? 'absent' : 'present' }));
  };

  const markAll = (status) => {
    const map = {};
    students.forEach(s => { map[s.id] = status; });
    setAttendance(map);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const subject = getSubjectInfo();
    const { data: config } = await supabase.from('system_config').select('value').eq('key', 'current_academic_year').single();
    const academicYear = config?.value || '2024-25';

    let lectureId;

    if (existing) {
      lectureId = existing.id;
      // Update existing attendance records
      for (const stu of students) {
        await supabase
          .from('attendance')
          .update({ status: attendance[stu.id], edited_by: authUser.id, edited_at: new Date().toISOString() })
          .eq('lecture_id', lectureId)
          .eq('student_id', stu.id);
      }
    } else {
      // Create lecture
      const { data: lec, error: lecErr } = await supabase
        .from('lectures')
        .insert([{
          subject_id: form.subject_id,
          teacher_id: authUser.id,
          date: form.date,
          lecture_no: parseInt(form.lecture_no),
          academic_year: academicYear,
          sem: subject.sem,
          blank_means: form.blank_means,
        }])
        .select('id')
        .single();

      if (lecErr) { toast.error(lecErr.message); setSaving(false); return; }
      lectureId = lec.id;

      // Insert attendance records
      const rows = students.map(s => ({
        lecture_id: lectureId,
        student_id: s.id,
        status: attendance[s.id],
        marked_by: authUser.id,
        academic_year: academicYear,
      }));
      const { error: attErr } = await supabase.from('attendance').insert(rows);
      if (attErr) { toast.error(attErr.message); setSaving(false); return; }
    }

    const present = Object.values(attendance).filter(v => v === 'present').length;
    toast.success(`Attendance saved! ${present}/${students.length} present.`);
    setSaving(false);
    setStep(1);
    setForm({ subject_id: '', lecture_no: '', date: new Date().toISOString().split('T')[0], blank_means: 'absent' });
  };

  const present = Object.values(attendance).filter(v => v === 'present').length;

  if (step === 2) {
    const subject = getSubjectInfo();
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Mark Attendance</h2>
            <p className="text-sm text-slate-500">
              {subject?.code} — {form.date} — Lecture {form.lecture_no}
              {existing && <span className="ml-2 text-amber-600 font-medium">(Editing existing)</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">
              {present}/{students.length} present
            </span>
            <Button variant="secondary" size="sm" onClick={() => markAll('present')}>All Present</Button>
            <Button variant="secondary" size="sm" onClick={() => markAll('absent')}>All Absent</Button>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>← Back</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {students.map(stu => {
            const isPresent = attendance[stu.id] === 'present';
            return (
              <div
                key={stu.id}
                onClick={() => toggleStudent(stu.id)}
                className={`cursor-pointer rounded-lg border-2 p-3 flex items-center gap-3 transition-all select-none ${
                  isPresent
                    ? 'border-green-400 bg-green-50'
                    : 'border-red-300 bg-red-50'
                }`}
              >
                {isPresent
                  ? <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                  : <XCircle className="w-6 h-6 text-red-400 shrink-0" />
                }
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{stu.users?.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{stu.roll_no}</p>
                </div>
                <Badge variant={isPresent ? 'success' : 'danger'} className="ml-auto shrink-0">
                  {isPresent ? 'P' : 'A'}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Mark Attendance</h2>
        <p className="text-sm text-slate-500">Select subject, date, and lecture number to begin.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">Subject</label>
          <select
            className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            value={form.subject_id}
            onChange={e => setForm({ ...form, subject_id: e.target.value })}
          >
            <option value="">Select your subject...</option>
            {assignments.map(a => (
              <option key={a.subject_id} value={a.subject_id}>
                {a.subjects?.code} — {a.subjects?.name} ({a.subjects?.branch}, Sem {a.subjects?.sem})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              className="h-10 rounded border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Lecture No.</label>
            <select
              className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={form.lecture_no}
              onChange={e => setForm({ ...form, lecture_no: e.target.value })}
            >
              <option value="">Select...</option>
              {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <Toggle
          label="Blank means (default for unmarked students)"
          option1={{ label: 'Absent', value: 'absent' }}
          option2={{ label: 'Present', value: 'present' }}
          value={form.blank_means}
          onChange={v => setForm({ ...form, blank_means: v })}
        />

        <Button className="w-full" onClick={handleProceed} disabled={loadingStudents}>
          {loadingStudents ? 'Loading students...' : 'Proceed to Mark Attendance →'}
        </Button>
      </div>
    </div>
  );
};
