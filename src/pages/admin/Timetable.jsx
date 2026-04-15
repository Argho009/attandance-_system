import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TimetableGrid } from '../../components/timetable/TimetableGrid';

// Used by both Admin and HOD basically
export const Timetable = () => {
    const [branch, setBranch] = useState('AI');
    const [sem, setSem] = useState(1);
    
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-slate-800">Timetable Management</h2>
                <p className="text-sm text-slate-500">Edit any cell across any branch or semester.</p>
            </div>
            
            <div className="bg-white p-4 border border-slate-200 rounded-md flex space-x-4 items-end">
                <Input label="Branch" value={branch} onChange={e => setBranch(e.target.value)} />
                <Input label="Semester" type="number" min="1" max="8" value={sem} onChange={e => setSem(parseInt(e.target.value))} />
            </div>
            
            <div className="bg-white p-4 shadow-sm border border-slate-200 rounded-md">
                <TimetableGrid branch={branch} sem={sem} />
            </div>
        </div>
    );
};
