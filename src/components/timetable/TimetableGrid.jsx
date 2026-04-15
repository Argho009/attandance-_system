import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

// Utility for formatting time slots
const getSlotLabels = (numSlots) => {
  return Array.from({ length: numSlots }, (_, i) => `Lec ${i + 1}`);
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CellEditor = ({ slotInfo, onClose, onSave, isAuthorized }) => {
  const [subjectId, setSubjectId] = useState(slotInfo.subject_id || '');
  const [room, setRoom] = useState(slotInfo.room || '');
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    // Fetch all active subjects for dropdown
    const fetchSubjects = async () => {
      const { data } = await supabase.from('subjects').select('id, code, name');
      if (data) setSubjects(data);
    };
    fetchSubjects();
  }, []);

  const handleSave = () => {
    onSave({ ...slotInfo, subject_id: subjectId, room });
  };

  return (
    <div className="p-4 bg-white rounded-md space-y-4">
      <div>
        <label className="text-sm font-medium">Subject</label>
        <select 
          className="w-full mt-1 border border-slate-300 rounded px-2 py-1"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          disabled={!isAuthorized}
        >
          <option value="">Select Subject...</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Room</label>
        <input 
          type="text" 
          className="w-full mt-1 border border-slate-300 rounded px-2 py-1"
          value={room} 
          onChange={(e) => setRoom(e.target.value)}
          disabled={!isAuthorized}
        />
      </div>
      {isAuthorized && (
        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="ghost" onClick={onClose} size="sm">Cancel</Button>
          <Button onClick={handleSave} size="sm">Save</Button>
        </div>
      )}
    </div>
  );
};

export const TimetableGrid = ({ branch, sem, readOnly = false }) => {
  const { role, user } = useAuth();
  const [slots, setSlots] = useState(8); // Default to 8
  const [timetable, setTimetable] = useState([]);
  const [editingCell, setEditingCell] = useState(null);

  useEffect(() => {
    const fetchConfigAndData = async () => {
      const { data: config } = await supabase.from('system_config').select('*').eq('key', 'lectures_per_day').single();
      if (config) setSlots(parseInt(config.value));

      if (branch && sem) {
        const { data } = await supabase
          .from('timetable')
          .select('*, subjects(code)')
          .eq('branch', branch)
          .eq('sem', sem);
        if (data) setTimetable(data);
      }
    };
    fetchConfigAndData();
  }, [branch, sem]);

  const handleSaveCell = async (updatedSlot) => {
    // In a real app we need to check RLS constraints carefully,
    // and log this edit in timetable_change_log
    const { error } = await supabase.from('timetable').upsert({
      branch,
      sem,
      day_of_week: updatedSlot.day_of_week,
      lecture_no: updatedSlot.lecture_no,
      subject_id: updatedSlot.subject_id || null,
      room: updatedSlot.room,
      edited_by: user.id,
      edited_at: new Date().toISOString()
    }, { onConflict: 'branch,sem,day_of_week,lecture_no' });

    if (error) {
      toast.error('Failed to update slot');
    } else {
      toast.success('Slot updated');
      setEditingCell(null);
      // Re-fetch
      const { data } = await supabase.from('timetable').select('*, subjects(code)').eq('branch', branch).eq('sem', sem);
      if (data) setTimetable(data);
    }
  };

  const getCellData = (day, lecNo) => {
    return timetable.find(t => t.day_of_week === day && t.lecture_no === lecNo);
  };

  const slotLabels = getSlotLabels(slots);
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  if (!branch || !sem) return <div className="p-4 text-slate-500">Select Branch and Sem to view timetable.</div>;

  return (
    <div className="overflow-x-auto overflow-y-visible border border-slate-200 rounded-md">
      <table className="w-full text-sm text-left table-fixed">
        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
          <tr>
            <th className="w-24 px-4 py-3 border-r border-slate-200 sticky left-0 bg-slate-50 z-10">Day</th>
            {slotLabels.map(label => (
              <th key={label} className="px-4 py-3 text-center border-r border-slate-200 w-32">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map(day => (
            <tr key={day} className={`border-b border-slate-200 ${day === currentDay ? 'bg-indigo-50/30' : 'bg-white'}`}>
              <td className="px-4 py-4 border-r border-slate-200 font-medium text-slate-700 sticky left-0 bg-inherit shadow-[1px_0_0_0_#e2e8f0] z-10">
                {day}
              </td>
              {Array.from({ length: slots }, (_, i) => i + 1).map(lecNo => {
                const cellData = getCellData(day, lecNo);
                const isAuthorizedToEdit = role === 'admin' || role === 'hod' || (role === 'teacher' && !readOnly); // Simplification for demo
                
                return (
                  <td 
                    key={lecNo} 
                    className="border-r border-slate-200 p-2 relative group hover:bg-slate-50 transition-colors"
                    onClick={() => {
                        if(!readOnly || role === 'admin' || role === 'hod') {
                             setEditingCell({
                                day_of_week: day,
                                lecture_no: lecNo,
                                subject_id: cellData?.subject_id,
                                room: cellData?.room
                             });
                        }
                    }}
                  >
                    <div className="flex flex-col items-center justify-center h-16 cursor-pointer rounded">
                      {cellData && cellData.subjects ? (
                        <>
                          <span className="font-semibold text-slate-800">{cellData.subjects.code}</span>
                          <span className="text-xs text-slate-500 mt-1">{cellData.room}</span>
                        </>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <Modal isOpen={!!editingCell} onClose={() => setEditingCell(null)} title="Edit Timetable Slot">
        {editingCell && (
          <CellEditor 
            slotInfo={editingCell} 
            onClose={() => setEditingCell(null)} 
            onSave={handleSaveCell}
            isAuthorized={role === 'admin' || role === 'hod'} 
          />
        )}
      </Modal>
    </div>
  );
};
