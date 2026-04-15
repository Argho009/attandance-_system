import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { exportCredentials } from '../../utils/exportExcel';
import { Download } from 'lucide-react';

export const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ college_id: '', name: '', role: 'student', initial_password: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) toast.error('Failed to fetch users');
    else setUsers(data || []);
    setLoading(false);
  };

  const handleDownloadCredentials = () => {
    exportCredentials(users);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    // Use an Edge Function or secure route to create Auth user and then insert to public.users.
    // However, for this demo/setup based on spec: "Admin creates all accounts"
    // Since Supabase requires using the admin-api or edge functions to create users,
    // we would ideally call that. Here's what we insert into public.users.
    toast.info("In a real system, this would call a Supabase Edge Function to create an Auth user first.");
    const { error } = await supabase.from('users').insert([
      { 
        college_id: newUser.college_id,
        name: newUser.name,
        role: newUser.role,
        initial_password: newUser.initial_password
      }
    ]);
    if (error) toast.error(error.message);
    else {
      toast.success('User created');
      setIsModalOpen(false);
      fetchUsers();
    }
  };

  const toggleActive = async (id, currentStatus) => {
    const { error } = await supabase.from('users').update({ is_active: !currentStatus }).eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Status updated');
      fetchUsers();
    }
  };

  const columns = [
    { header: 'College ID', accessor: 'college_id' },
    { header: 'Name', accessor: 'name' },
    { 
      header: 'Role', 
      accessor: 'role',
      render: (row) => <Badge variant={row.role === 'admin' ? 'danger' : row.role === 'hod' ? 'purple' : 'default'} className="uppercase">{row.role}</Badge>
    },
    { 
      header: 'Active', 
      accessor: 'is_active',
      render: (row) => <Badge variant={row.is_active ? 'success' : 'danger'}>{row.is_active ? 'Yes' : 'No'}</Badge> 
    },
    {
      header: 'Actions',
      accessor: 'id',
      sortable: false,
      render: (row) => (
        <Button variant={row.is_active ? "ghost" : "primary"} size="sm" onClick={() => toggleActive(row.id, row.is_active)}>
          {row.is_active ? 'Deactivate' : 'Activate'}
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">User Management</h2>
          <p className="text-sm text-slate-500">Manage all users across the college system.</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={handleDownloadCredentials} className="flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Download Credentials (Excel)
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>Add User</Button>
        </div>
      </div>

      <div className="bg-white">
        <Table columns={columns} data={users} searchKey="name" />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New User">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input label="College ID" value={newUser.college_id} onChange={e => setNewUser({...newUser, college_id: e.target.value})} required />
          <Input label="Name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Role</label>
            <select 
              className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="hod">HOD</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Input label="Initial Password" type="password" value={newUser.initial_password} onChange={e => setNewUser({...newUser, initial_password: e.target.value})} required />
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create User</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
