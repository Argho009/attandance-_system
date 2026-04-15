import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { rawPercent, finalPercent, colorForPercent } from '../../utils/attendanceCalc';

export const HodAttendance = () => {
  const [branch, setBranch] = useState('');
  const [sem, setSem] = useState('');
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    supabase.from('branches').select('name').then(({ data }) => {
      if (data) setBranches(data.map((b) => b.name));
    });
  }, []);

  const generateReport = async () => {
    if (!branch || !sem) return toast.error('Select branch and semester');
    setLoading(true);

    // Get all students in this branch/sem
    const { data: students, error: stuErr } = await supabase
      .from('students')
      .select('id, roll_no, user_id, users(name)')
      .eq('branch', branch)
      .eq('sem', parseInt(sem));

    if (stuErr || !students?.length) {
      toast.error('No students found');
      setLoading(false);
      return;
    }

    // Get all lectures for this branch/sem
    const { data: lectures } = await supabase
      .from('lectures')
      .select('id, subject_id, subjects(code)')
      .eq('sem', parseInt(sem))
      .eq('is_skipped', false);

    const lectureIds = (lectures || []).map((l) => l.id);

    // Get attendance for these students
    const { data: attendance } = await supabase
      .from('attendance')
      .select('student_id, lecture_id, status')
      .in('lecture_id', lectureIds);

    // Get condonation
    const { data: condonation } = await supabase
      .from('attendance_condonation')
      .select('student_id, subject_id, lectures_condoned')
      .in('student_id', students.map((s) => s.id))
      .eq('status', 'approved');

    const reportRows = students.map((stu) => {
      const stuAttendance = (attendance || []).filter((a) => a.student_id === stu.id);
      const present = stuAttendance.filter((a) => a.status === 'present').length;
      const total = lectureIds.length;
      const condoned = (condonation || [])
        .filter((c) => c.student_id === stu.id)
        .reduce((acc, c) => acc + c.lectures_condoned, 0);
      const raw = rawPercent(present, total);
      const final = finalPercent(present, condoned, total);
      return {
        roll_no: stu.roll_no,
        name: stu.users?.name || 'Unknown',
        present,
        total,
        condoned,
        raw,
        final,
      };
    });

    setReport(reportRows.sort((a, b) => a.final - b.final));
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Attendance Overview</h2>
        <p className="text-sm text-slate-500">View cumulative attendance for any branch and semester.</p>
      </div>

      <div className="bg-white p-4 border border-slate-200 rounded-lg flex gap-4 items-end flex-wrap">
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">Branch</label>
          <select
            className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 min-w-[120px]"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            <option value="">Select...</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">Semester</label>
          <select
            className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            value={sem}
            onChange={(e) => setSem(e.target.value)}
          >
            <option value="">Select...</option>
            {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Sem {s}</option>)}
          </select>
        </div>
        <Button onClick={generateReport} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Report'}
        </Button>
      </div>

      {report.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm text-left text-slate-700">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Roll No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 text-center">Present</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3 text-center">Condoned</th>
                <th className="px-4 py-3 text-center">Raw %</th>
                <th className="px-4 py-3 text-center">Final %</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{row.roll_no}</td>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3 text-center">{row.present}</td>
                  <td className="px-4 py-3 text-center">{row.total}</td>
                  <td className="px-4 py-3 text-center">{row.condoned}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colorForPercent(row.raw)}`}>
                      {row.raw}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colorForPercent(row.final)}`}>
                      {row.final}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={row.final >= 75 ? 'success' : row.final >= 65 ? 'warning' : 'danger'}>
                      {row.final >= 75 ? 'OK' : row.final >= 65 ? 'Condone' : 'Detained'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
