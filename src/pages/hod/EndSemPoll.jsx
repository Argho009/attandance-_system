import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { Toggle } from '../../components/ui/Toggle';

export const HodEndSemPoll = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ subject_id: '', sem: '', academic_year: '' });

  useEffect(() => {
    fetchData();
    supabase.from('subjects').select('id, code, name, sem').then(({ data }) => {
      if (data) setSubjects(data);
    });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('endsem_marks')
      .select('*, subjects(code, name), students(roll_no, users(name))')
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load');
    else setSubmissions(data || []);
    setLoading(false);
  };

  const togglePoll = async (subjectId, academicYear, sem, currentState) => {
    const { error } = await supabase
      .from('endsem_marks')
      .update({ poll_open: !currentState })
      .eq('subject_id', subjectId)
      .eq('academic_year', academicYear)
      .eq('sem', sem);
    if (error) toast.error(error.message);
    else { toast.success(`Poll ${!currentState ? 'opened' : 'closed'}`); fetchData(); }
  };

  const lockMarks = async (subjectId, academicYear, sem) => {
    const { error } = await supabase
      .from('endsem_marks')
      .update({ is_locked: true, verified_by: user.id })
      .eq('subject_id', subjectId)
      .eq('academic_year', academicYear)
      .eq('sem', sem);
    if (error) toast.error(error.message);
    else { toast.success('Marks locked and verified'); fetchData(); }
  };

  // Group submissions by subject
  const grouped = submissions.reduce((acc, s) => {
    const key = `${s.subject_id}-${s.academic_year}-${s.sem}`;
    if (!acc[key]) acc[key] = { ...s, count: 0, submitted: 0 };
    acc[key].count += 1;
    if (s.marks !== null) acc[key].submitted += 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">End Semester Poll</h2>
          <p className="text-sm text-slate-500">Open/close mark submission polls and lock verified marks.</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-slate-400">No end semester submissions found.</p>
      ) : (
        <div className="space-y-3">
          {Object.values(grouped).map((g) => (
            <div key={`${g.subject_id}-${g.academic_year}`} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="indigo">{g.subjects?.code}</Badge>
                    <Badge variant={g.is_locked ? 'success' : g.poll_open ? 'blue' : 'default'}>
                      {g.is_locked ? 'Locked' : g.poll_open ? 'Poll Open' : 'Poll Closed'}
                    </Badge>
                    <span className="text-xs text-slate-500">Sem {g.sem} • {g.academic_year}</span>
                  </div>
                  <p className="font-semibold text-slate-800">{g.subjects?.name}</p>
                  <p className="text-sm text-slate-500">
                    Submitted: <strong>{g.submitted}</strong> / {g.count} students
                  </p>
                </div>
                {!g.is_locked && (
                  <div className="flex gap-2 shrink-0 flex-col">
                    <Button
                      size="sm"
                      variant={g.poll_open ? 'secondary' : 'primary'}
                      onClick={() => togglePoll(g.subject_id, g.academic_year, g.sem, g.poll_open)}
                    >
                      {g.poll_open ? 'Close Poll' : 'Open Poll'}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => lockMarks(g.subject_id, g.academic_year, g.sem)}>
                      Lock & Verify
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
