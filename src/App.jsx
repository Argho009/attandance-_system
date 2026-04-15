import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/ui/Toast';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/auth/Login';

// Placeholder Pages for all roles to scaffold routing
const Placeholder = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-full text-slate-500">
    <h2 className="text-2xl font-semibold mb-2">{title}</h2>
    <p>This page is under construction based on the specification.</p>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { session, role, loading } = useAuth();
  
  if (loading) return null; // or full screen spinner
  if (!session) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={`/${role}`} replace />;
  }
  return children;
};

const RootRedirect = () => {
  const { session, role, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={`/${role}`} replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RootRedirect />} />

      {/* ADMIN ROUTES */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Layout showPinboard={false} /></ProtectedRoute>}>
        <Route index element={<Placeholder title="Admin Dashboard" />} />
        <Route path="users" element={<Placeholder title="User Management" />} />
        <Route path="bulk-upload" element={<Placeholder title="Bulk Upload" />} />
        <Route path="marks-upload" element={<Placeholder title="Marks Upload" />} />
        <Route path="timetable" element={<Placeholder title="Timetable Management" />} />
        <Route path="subjects" element={<Placeholder title="Subject Management" />} />
        <Route path="sem-transition" element={<Placeholder title="Semester Transition" />} />
        <Route path="config" element={<Placeholder title="System Config" />} />
        <Route path="notices" element={<Placeholder title="Notice Management" />} />
      </Route>

      {/* HOD ROUTES */}
      <Route path="/hod" element={<ProtectedRoute allowedRoles={['hod']}><Layout showPinboard={true} /></ProtectedRoute>}>
        <Route index element={<Placeholder title="HOD Dashboard" />} />
        <Route path="attendance" element={<Placeholder title="Attendance Overview" />} />
        <Route path="analysis" element={<Placeholder title="Marks Analysis" />} />
        <Route path="holidays" element={<Placeholder title="Holiday Management" />} />
        <Route path="end-sem-poll" element={<Placeholder title="End Sem Poll" />} />
        <Route path="timetable" element={<Placeholder title="Timetable" />} />
        <Route path="subjects" element={<Placeholder title="Subjects and Assignment" />} />
        <Route path="leave-management" element={<Placeholder title="Leave Management" />} />
        <Route path="condonation" element={<Placeholder title="Condonation Approval" />} />
        <Route path="change-requests" element={<Placeholder title="Change Requests" />} />
        <Route path="notices" element={<Placeholder title="Notices" />} />
      </Route>

      {/* TEACHER ROUTES */}
      <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><Layout showPinboard={true} /></ProtectedRoute>}>
        <Route index element={<Placeholder title="Teacher Dashboard" />} />
        <Route path="mark-attendance" element={<Placeholder title="Mark Attendance" />} />
        <Route path="multi-class" element={<Placeholder title="Multi-Class Attendance" />} />
        <Route path="borrow" element={<Placeholder title="Borrow Lecture" />} />
        <Route path="leave-request" element={<Placeholder title="Leave Request" />} />
        <Route path="condonation" element={<Placeholder title="Condonation Request" />} />
        <Route path="history" element={<Placeholder title="Attendance History" />} />
        <Route path="timetable" element={<Placeholder title="Timetable" />} />
        <Route path="notices" element={<Placeholder title="Notices" />} />
      </Route>

      {/* STUDENT ROUTES */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><Layout showPinboard={true} /></ProtectedRoute>}>
        <Route index element={<Placeholder title="Student Dashboard" />} />
        <Route path="attendance" element={<Placeholder title="My Attendance" />} />
        <Route path="marks" element={<Placeholder title="My Marks" />} />
        <Route path="condonation" element={<Placeholder title="Condonation Request" />} />
        <Route path="end-sem" element={<Placeholder title="End Sem Submissions" />} />
        <Route path="notices" element={<Placeholder title="Notice Board" />} />
        <Route path="profile" element={<Placeholder title="Profile" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
