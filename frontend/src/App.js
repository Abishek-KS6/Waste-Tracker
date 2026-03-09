import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import CollectorDashboard from './pages/CollectorDashboard.js';
import ResidentDashboard from './pages/ResidentDashboard';
import './index.css';

// Role-based route guard
const PrivateRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('wt_token');
  const user  = JSON.parse(localStorage.getItem('wt_user') || '{}');

  if (!token) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" />;
  }
  return children;
};

// Auto-redirect to correct dashboard based on role
const RoleRedirect = () => {
  const user = JSON.parse(localStorage.getItem('wt_user') || '{}');
  if (user.role === 'admin')     return <Navigate to="/admin" />;
  if (user.role === 'collector') return <Navigate to="/collector" />;
  if (user.role === 'resident')  return <Navigate to="/resident" />;
  return <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Role-based dashboards */}
        <Route path="/admin" element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </PrivateRoute>
        } />
        <Route path="/collector" element={
          <PrivateRoute allowedRoles={['collector']}>
            <CollectorDashboard />
          </PrivateRoute>
        } />
        <Route path="/resident" element={
          <PrivateRoute allowedRoles={['resident']}>
            <ResidentDashboard />
          </PrivateRoute>
        } />

        {/* Auto redirect based on role */}
        <Route path="/dashboard" element={
          <PrivateRoute allowedRoles={['admin','collector','resident']}>
            <RoleRedirect />
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;