import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export const SemTransition = () => {
  const [branch, setBranch] = useState('');
  const [oldSem, setOldSem] = useState(1);
  const [newSem, setNewSem] = useState(2);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [affectedCount, setAffectedCount] = useState(0);

  const handlePreview = async () => {
    if (!branch) return toast.error("Select a branch");
    
    const { count, error } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('branch', branch)
      .eq('sem', oldSem);
      
    if (error) {
      toast.error(error.message);
    } else {
      setAffectedCount(count || 0);
      setIsConfirmOpen(true);
    }
  };

  const executeTransition = async () => {
    const { data: userData } = await supabase.auth.getUser();
    
    // Simulate bulk update - ideally an edge function for complex operations
    const { error: updateError } = await supabase
      .from('students')
      .update({ sem: newSem })
      .eq('branch', branch)
      .eq('sem', oldSem);

    if (updateError) {
      toast.error(updateError.message);
    } else {
      // Log transition
      await supabase.from('semester_transitions').insert([{
        triggered_by: userData.user.id,
        branch,
        old_sem: oldSem,
        new_sem: newSem,
        affected_students: affectedCount
      }]);
      
      toast.success(`Successfully transitioned ${affectedCount} students from Sem ${oldSem} to Sem ${newSem}.`);
    }
    setIsConfirmOpen(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Semester Transition</h2>
        <p className="text-sm text-slate-500">Move students from an older semester to a new semester in bulk.</p>
      </div>

      <div className="bg-white p-6 border border-slate-200 rounded-md space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Branch</label>
            <input 
              type="text" 
              className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="e.g. CS"
              value={branch}
              onChange={e => setBranch(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Old Semester</label>
            <input 
              type="number" min="1" max="8"
              className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={oldSem}
              onChange={e => setOldSem(parseInt(e.target.value))}
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">New Semester</label>
            <input 
              type="number" min="1" max="8"
              className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
              value={newSem}
              onChange={e => setNewSem(parseInt(e.target.value))}
            />
          </div>
        </div>

        {newSem < oldSem && (
          <div className="p-3 bg-red-50 text-red-700 text-sm border border-red-200 rounded-md">
            <strong>Warning:</strong> You are decreasing the semester value. This is highly unusual.
          </div>
        )}

        <Button onClick={handlePreview} className="w-full">Preview & Confirm</Button>
      </div>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeTransition}
        title="Confirm Semester Transition"
        message={`You are about to move ${affectedCount} students in branch ${branch} from Sem ${oldSem} to Sem ${newSem}. This action changes their current semester. Past attendance and marks remain tagged to the old academic year.`}
      />
    </div>
  );
};
