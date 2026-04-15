import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { StatCard } from '../../components/ui/StatCard';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Users, BookOpen, GraduationCap, AlertTriangle } from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, students: 0, teachers: 0, subjects: 0 });
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [usersRes, studentsRes, teachersRes, subjectsRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        users: usersRes.count || 0,
        students: studentsRes.count || 0,
        teachers: teachersRes.count || 0,
        subjects: subjectsRes.count || 0,
      });

      const { data: recent } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentUsers(recent || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const columns = [
    { header: 'College ID', accessor: 'college_id' },
    { header: 'Name', accessor: 'name' },
    {
      header: 'Role',
      accessor: 'role',
      render: (row) => (
        <Badge variant={row.role === 'admin' ? 'danger' : row.role === 'hod' ? 'purple' : row.role === 'teacher' ? 'blue' : 'success'} className="uppercase">
          {row.role}
        </Badge>
      ),
    },
    {
      header: 'Status',
      accessor: 'is_active',
      render: (row) => <Badge variant={row.is_active ? 'success' : 'danger'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      header: 'Joined',
      accessor: 'created_at',
      render: (row) => new Date(row.created_at).toLocaleDateString('en-IN'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Admin Dashboard</h2>
        <p className="text-sm text-slate-500">System overview and recent activity.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={loading ? '...' : stats.users} subtitle="All roles" color="indigo" />
        <StatCard title="Students" value={loading ? '...' : stats.students} subtitle="Enrolled" color="green" />
        <StatCard title="Teachers" value={loading ? '...' : stats.teachers} subtitle="Faculty members" color="slate" />
        <StatCard title="Subjects" value={loading ? '...' : stats.subjects} subtitle="All branches" color="indigo" />
      </div>

      <div>
        <h3 className="text-base font-semibold text-slate-700 mb-3">Recently Added Users</h3>
        <Table columns={columns} data={recentUsers} emptyMessage="No users found." />
      </div>
    </div>
  );
};
