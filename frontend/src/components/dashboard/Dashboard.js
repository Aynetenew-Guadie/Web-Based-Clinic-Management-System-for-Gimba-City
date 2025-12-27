import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleRoutes = {
    patient: '/patient',
    doctor: '/doctor',
    receptionist: '/reception',
    lab_technician: '/lab',
    pharmacist: '/pharmacist',
    admin: '/admin'
  };
  
  const redirectPath = roleRoutes[user.role] || '/patient';
  return <Navigate to={redirectPath} replace />;
};

export default Dashboard;
