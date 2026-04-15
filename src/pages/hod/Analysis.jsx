import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const HodAnalysis = () => {
  const [branch, setBranch] = useState('');
  const [sem, setSem] = useState('');
  const [subject, setSubject] = useState('');
  const [testName, setTestName] = useState('');
  const [chartData, setChartData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('branches').select('name').then(({ data }) => {
      if (data) setBranches(data.map((b) => b.name));
    });
  }, []);

  useEffect(() => {
    if (branch && sem) {
      supabase.from('subjects').select('id, code, name').eq('branch', branch).eq('sem', parseInt(sem))
        .then(({ data }) => { if (data) setSubjects(data); });
    }
  }, [branch, sem]);

  const generateChart = async () => {
    if (!subject || !testName) return toast.error('Select subject and test name');
    setLoading(true);
    const { data, error } = await supabase
      .from('ct_marks')
      .select('marks_obtained, max_marks, students(roll_no, users(name))')
      .eq('subject_id', subject)
      .eq('test_name', testName);

    if (error) { toast.error(error.message); setLoading(false); return; }

    const processed = (data || []).map((d) => ({
      name: d.students?.roll_no || 'N/A',
      marks: d.marks_obtained,
      max: d.max_marks,
      pct: d.max_marks ? Math.round((d.marks_obtained / d.max_marks) * 100) : 0,
    })).sort((a, b) => b.pct - a.pct);

    setChartData(processed);
    setLoading(false);
  };

  const avg = chartData.length ? (chartData.reduce((a, b) => a + b.pct, 0) / chartData.length).toFixed(1) : 0;
  const below40 = chartData.filter((d) => d.pct < 40).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Marks Analysis</h2>
        <p className="text-sm text-slate-500">View CT/Test marks distribution per subject.</p>
      </div>

      <div className="bg-white p-4 border border-slate-200 rounded-lg flex gap-4 flex-wrap items-end">
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">Branch</label>
          <select className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">Select...</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">Semester</label>
          <select className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={sem} onChange={(e) => setSem(e.target.value)}>
            <option value="">Select...</option>
            {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Sem {s}</option>)}
          </select>
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">Subject</label>
          <select className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Select...</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} – {s.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">Test Name</label>
          <input className="h-10 rounded border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" placeholder="e.g. CT1" value={testName} onChange={(e) => setTestName(e.target.value)} />
        </div>
        <Button onClick={generateChart} disabled={loading}>{loading ? 'Loading...' : 'Generate'}</Button>
      </div>

      {chartData.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
              <p className="text-xs font-semibold text-indigo-600 uppercase">Class Average</p>
              <p className="text-3xl font-bold text-indigo-900 mt-1">{avg}%</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-xs font-semibold text-green-600 uppercase">Students</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{chartData.length}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-xs font-semibold text-red-600 uppercase">Below 40%</p>
              <p className="text-3xl font-bold text-red-900 mt-1">{below40}</p>
            </div>
          </div>

          <div className="bg-white p-4 border border-slate-200 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Marks Distribution (%)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="pct" name="Score %" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};
