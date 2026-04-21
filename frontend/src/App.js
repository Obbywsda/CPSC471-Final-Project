import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import RoleSelectPage from './pages/RoleSelectPage';
import FleetInventory from './pages/FleetInventory';
import Maintenance from './pages/Maintenance';
import Reservations from './pages/Reservations';
import Reports from './pages/Reports';

function ProtectedRoute({ children, mechanicAllowed = true }) {
  const { role, isMechanic } = useAuth();
  if (!role) return <Navigate to="/" replace />;
  if (!mechanicAllowed && isMechanic) return <Navigate to="/fleet" replace />;
  return children;
}

export default function App() {
  const { role } = useAuth();

  return (
    <Routes>
      <Route path="/" element={role ? <Navigate to="/dashboard" replace /> : <RoleSelectPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/fleet" element={<ProtectedRoute><FleetInventory /></ProtectedRoute>} />
      <Route path="/fleet/:vin" element={<ProtectedRoute><FleetInventory /></ProtectedRoute>} />
      <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
      <Route path="/reservations" element={<ProtectedRoute mechanicAllowed={false}><Reservations /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
