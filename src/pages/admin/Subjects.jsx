import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/Toast';

export const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', code: '', sem: 1, branch: '' });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('subjects').select('*').order('created_at', { ascending: false });
    if (error) toast.error('Failed to fetch subjects');
    else setSubjects(data || []);
    setLoading(false);
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('subjects').insert([newSubject]);
    if (error) toast.error(error.message);
    else {
      toast.success('Subject created');
      setIsModalOpen(false);
      setNewSubject({ name: '', code: '', sem: 1, branch: '' });
      fetchSubjects();
    }
  };

  const columns = [
    { header: 'Code', accessor: 'code' },
    { header: 'Name', accessor: 'name' },
    { header: 'Branch', accessor: 'branch' },
    { header: 'Semester', accessor: 'sem' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Subject Management</h2>
          <p className="text-sm text-slate-500">Manage all subjects across branches and semesters.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Add Subject</Button>
      </div>

      <div className="bg-white">
        <Table columns={columns} data={subjects} searchKey="name" />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Subject">
        <form onSubmit={handleCreateSubject} className="space-y-4">
          <Input label="Subject Name" value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} required />
          <Input label="Subject Code" value={newSubject.code} onChange={e => setNewSubject({...newSubject, code: e.target.value})} required />
          <Input label="Branch" placeholder="e.g. CS, AI" value={newSubject.branch} onChange={e => setNewSubject({...newSubject, branch: e.target.value})} required />
          <Input label="Semester" type="number" min="1" max="8" value={newSubject.sem} onChange={e => setNewSubject({...newSubject, sem: parseInt(e.target.value)})} required />
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Subject</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
