import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';

export const TeacherHistory = () => {
  const { user } = useAuth();
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ from: '', to: '' });

  useEffect(() => { fetchHistory(); }, [user]);

  const fetchHistory = async () => {
    setLoading(true);
    let query = supabase
      .from('lectures')
      .select('*, subjects(code, name, branch)')
      .eq('teacher_id', user.id)
      .order('date', { ascending: false })
      .order('lecture_no');

    if (filter.from) query = query.gte('date', filter.from);
    if (filter.to) query = query.lte('date', filter.to);

    const { data, error } = await query;
    if (error) toast.error('Failed to load');
    else setLectures(data || []);
    setLoading(false);
  };

  const grouped = lectures.reduce((acc, l) => {
    const key = l.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Attendance History</h2>
        <p className="text-sm text-slate-500">All lectures you've conducted.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 flex gap-4 items-end flex-wrap">
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">From</label>
          <input type="date" className="h-10 rounded border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={filter.from} onChange={e => setFilter({ ...filter, from: e.target.value })} />
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">To</label>
          <input type="date" className="h-10 rounded border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={filter.to} onChange={e => setFilter({ ...filter, to: e.target.value })} />
        </div>
        <Button onClick={fetchHistory}>Filter</Button>
        <Button variant="ghost" onClick={() => { setFilter({ from: '', to: '' }); setTimeout(fetchHistory, 0); }}>Clear</Button>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
        <div className="space-y-4">
          {Object.keys(grouped).length === 0 && <p className="text-sm text-slate-400">No lectures found.</p>}
          {Object.entries(grouped).map(([date, dayLectures]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-slate-600 mb-2">
                {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              <div className="space-y-2">
                {dayLectures.map(l => (
                  <div key={l.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {l.lecture_no}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 text-sm">{l.subjects?.code} — {l.subjects?.name}</p>
                      <p className="text-xs text-slate-500">{l.subjects?.branch}</p>
                    </div>
                    {l.is_skipped && <Badge variant="warning">Skipped</Badge>}
                    {l.skip_reason && <p className="text-xs text-slate-400">{l.skip_reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
