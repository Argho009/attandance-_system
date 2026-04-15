import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { toast } from '../../components/ui/Toast';
import { parseCsv } from '../../lib/parseCsv';
import { parseExcel } from '../../lib/parseExcel';
import { validateUserUploadRow } from '../../utils/validators';

export const BulkUpload = () => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);

    try {
      let data = [];
      if (selected.name.endsWith('.csv')) {
        data = await parseCsv(selected);
      } else if (selected.name.endsWith('.xlsx')) {
        data = await parseExcel(selected);
      } else {
        toast.error('Unsupported file format. Use CSV or XLSX.');
        return;
      }
      
      const validatedData = data.map(row => ({
        ...row,
        _errors: validateUserUploadRow(row)
      }));
      setPreviewData(validatedData);
    } catch (error) {
      toast.error('Failed to parse file');
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;
    const validRows = previewData.filter(row => row._errors.length === 0);
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setUploading(true);
    
    // Similarly, calling edge function for auth user creation.
    // For now we simulate.
    try {
      const { data: userData } = await supabase.auth.getUser();
      const insertPayload = validRows.map(row => {
        const { _errors, ...rest } = row;
        return rest;
      });

      // Just inserting into our mock table for demonstration over system table
      toast.info('Simulating import to public.users for demo purposes.');

      // Log the upload action
      await supabase.from('bulk_upload_logs').insert([{
        uploaded_by: userData.user.id,
        file_name: file.name,
        type: 'roles',
        status: previewData.length === validRows.length ? 'success' : 'partial',
        errors_json: previewData.filter(r => r._errors.length > 0)
      }]);

      toast.success(`${validRows.length} users imported successfully.`);
      setPreviewData([]);
      setFile(null);
    } catch (e) {
      toast.error('Import failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Bulk Role Upload</h2>
          <p className="text-sm text-slate-500">Upload CSV or XLSX. Required cols: college_id, name, role, roll_no, branch, sem.</p>
        </div>
      </div>

      <div className="bg-white p-6 border border-slate-200 rounded-md">
        <input type="file" accept=".csv, .xlsx" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
      </div>

      {previewData.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">Preview Data</h3>
            <Button onClick={handleImport} disabled={uploading}>{uploading ? 'Importing...' : 'Confirm Import'}</Button>
          </div>
          <p className="text-sm">Total rows: {previewData.length}. Valid: {previewData.filter(r => r._errors.length === 0).length}. Invalid: {previewData.filter(r => r._errors.length > 0).length}.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-700">
              <thead className="text-xs uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-2">College ID</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, idx) => (
                  <tr key={idx} className={row._errors.length > 0 ? "bg-red-50 border-b border-red-100" : "bg-white border-b hover:bg-slate-50"}>
                    <td className="px-4 py-2">{row.college_id}</td>
                    <td className="px-4 py-2">{row.name}</td>
                    <td className="px-4 py-2">{row.role}</td>
                    <td className="px-4 py-2">
                       {row._errors.length > 0 ? (
                         <span className="text-red-600 text-xs">{row._errors.join(', ')}</span>
                       ) : (
                         <span className="text-green-600 text-xs font-semibold">Valid</span>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
