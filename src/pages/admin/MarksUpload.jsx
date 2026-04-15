import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { parseExcel } from '../../lib/parseExcel';
import { parseCsv } from '../../lib/parseCsv';
import { validateMarksUploadRow } from '../../utils/validators';

export const MarksUpload = () => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [details, setDetails] = useState({ subject_id: '', test_name: '', branch: '', sem: 1, academic_year: '2024-25' });

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);

    try {
        let data = [];
        if (selected.name.endsWith('.csv')) data = await parseCsv(selected);
        else data = await parseExcel(selected);
        
        const validated = data.map(r => ({ ...r, _errors: validateMarksUploadRow(r) }));
        setPreviewData(validated);
    } catch {
        toast.error('File parse failed');
    }
  };

  const handleImport = async () => {
      // Stub: in real world, map roll_no to student_id and insert to ct_marks
      toast.success("Marks imported successfully (simulation)");
      setPreviewData([]);
      setFile(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Marks Upload</h2>
        <p className="text-sm text-slate-500">Upload CT or custom test marks.</p>
      </div>

      <div className="bg-white p-6 border border-slate-200 rounded-md grid grid-cols-2 gap-4">
        <Input label="Branch" value={details.branch} onChange={e => setDetails({...details, branch: e.target.value})} />
        <Input label="Sem" type="number" value={details.sem} onChange={e => setDetails({...details, sem: e.target.value})} />
        <Input label="Subject ID (Placeholder)" value={details.subject_id} onChange={e => setDetails({...details, subject_id: e.target.value})} />
        <Input label="Test Name (e.g. CT1)" value={details.test_name} onChange={e => setDetails({...details, test_name: e.target.value})} />
      </div>

      <div className="bg-white p-6 border border-slate-200 rounded-md">
        <input type="file" accept=".csv, .xlsx" onChange={handleFileChange} />
      </div>

      {previewData.length > 0 && (
         <div className="space-y-4">
             <div className="flex justify-between">
                 <h3 className="font-semibold">Preview</h3>
                 <Button onClick={handleImport}>Confirm Import</Button>
             </div>
             {/* Simple table implementation omitted for brevity, similar to bulk upload */}
             <div className="text-sm">Total: {previewData.length} records.</div>
         </div>
      )}
    </div>
  );
};
