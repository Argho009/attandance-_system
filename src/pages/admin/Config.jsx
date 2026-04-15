import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { toast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

export const Config = () => {
  const [configParams, setConfigParams] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
    fetchBranches();
  }, []);

  const fetchConfig = async () => {
    const { data, error } = await supabase.from('system_config').select('*');
    if (!error && data) setConfigParams(data);
  };

  const fetchBranches = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('branches').select('*');
    if (!error && data) setBranches(data);
    setLoading(false);
  };

  const handleUpdateConfig = async (key, value) => {
    const { error } = await supabase.from('system_config').update({ value }).eq('key', key);
    if (error) toast.error("Failed to update");
    else toast.success("Config updated");
  };

  const handleAddBranch = async () => {
    const name = window.prompt("Enter new branch name (e.g. AI, CS):");
    if (!name) return;
    const { error } = await supabase.from('branches').insert([{ name }]);
    if (error) toast.error(error.message);
    else {
      toast.success("Branch added");
      fetchBranches();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">System Config</h2>
        <p className="text-sm text-slate-500">Manage global system parameters.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {configParams.map(param => (
          <div key={param.key} className="bg-white p-6 border border-slate-200 rounded-md">
            <h3 className="text-sm font-semibold text-slate-700 capitalize">{param.key.replace(/_/g, ' ')}</h3>
            <div className="mt-4 flex items-center space-x-4">
              <Input 
                className="w-full" 
                defaultValue={param.value} 
                onBlur={(e) => {
                  if (e.target.value !== param.value) handleUpdateConfig(param.key, e.target.value);
                }} 
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">Updates save on blur.</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Branches Management</h3>
          <Button size="sm" onClick={handleAddBranch}>Add Branch</Button>
        </div>
        <div className="bg-white">
          <Table 
            columns={[
              { header: 'Branch Name', accessor: 'name' },
              { header: 'Added At', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleDateString() }
            ]} 
            data={branches} 
          />
        </div>
      </div>
    </div>
  );
};
