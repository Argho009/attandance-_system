import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { rawPercent, finalPercent, colorForPercent } from '../../utils/attendanceCalc';
import { Bell, BookOpen } from 'lucide-react';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [subjectSummary, setSubjectSummary] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data: stu } = await supabase.from('students').select('id, roll_no, branch, sem, users(name)').eq('user_id', user.id).single();
    if (!stu) { setLoading(false); return; }
    setStudent(stu);

    // Get subjects for this student's branch/sem
    const { data: subjects } = await supabase.from('subjects').select('id, code, name').eq('branch', stu.branch).eq('sem', stu.sem);

    if (subjects?.length) {
      const { data: lectures } = await supabase.from('lectures').select('id, subject_id').eq('sem', stu.sem).eq('is_skipped', false);
      const { data: attendance } = await supabase.from('attendance').select('lecture_id, status, lectures(subject_id)').eq('student_id', stu.id);
      const { data: condonation } = await supabase.from('attendance_condonation').select('subject_id, lectures_condoned').eq('student_id', stu.id).eq('status', 'approved');

      const summary = subjects.map(sub => {
        const subLectures = (lectures || []).filter(l => l.subject_id === sub.id);
        const subAttendance = (attendance || []).filter(a => a.lectures?.subject_id === sub.id);
        const present = subAttendance.filter(a => a.status === 'present').length;
        const total = subLectures.length;
        const condoned = (condonation || []).filter(c => c.subject_id === sub.id).reduce((acc, c) => acc + c.lectures_condoned, 0);
        const raw = rawPercent(present, total);
        const final = finalPercent(present, condoned, total);
        return { ...sub, present, total, condoned, raw, final };
      });
      setSubjectSummary(summary);
    }

    const { data: noticesData } = await supabase.from('notices').select('*').eq('is_active', true).or(`branch.eq.${stu.branch},branch.is.null`).eq('sem', stu.sem).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3);
    setNotices(noticesData || []);
    setLoading(false);
  };

  if (loading) return <p className="text-sm text-slate-500">Loading dashboard...</p>;
  if (!student) return <p className="text-sm text-red-500">Student profile not found. Contact admin.</p>;

  const overall = subjectSummary.length
    ? subjectSummary.reduce((a, b) => a + b.final, 0) / subjectSummary.length
    : 0;
  const lowCount = subjectSummary.filter(s => s.final < 75).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Welcome, {student.users?.name}</h2>
        <p className="text-sm text-slate-500">{student.roll_no} • {student.branch} • Semester {student.sem}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Overall Attendance" value={`${overall.toFixed(1)}%`} color={overall >= 75 ? 'green' : 'red'} />
        <StatCard title="Subjects" value={subjectSummary.length} color="indigo" />
        <StatCard title="Below 75%" value={lowCount} color={lowCount > 0 ? 'red' : 'slate'} subtitle="Subjects at risk" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Subject-wise Attendance
        </h3>
        <div className="space-y-2">
          {subjectSummary.map(s => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">{s.code} <span className="font-normal text-slate-500">— {s.name}</span></p>
                <p className="text-xs text-slate-400">{s.present}/{s.total} attended{s.condoned > 0 ? ` • ${s.condoned} condoned` : ''}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${colorForPercent(s.final)}`}>{s.final}%</span>
            </div>
          ))}
        </div>
      </div>

      {notices.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Recent Notices
          </h3>
          <div className="space-y-2">
            {notices.map(n => (
              <div key={n.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800 text-sm">{n.title}</p>
                  <Badge variant="default">{n.type}</Badge>
                </div>
                {n.due_date && <p className="text-xs text-red-600 mt-1">Due: {new Date(n.due_date).toLocaleDateString('en-IN')}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
