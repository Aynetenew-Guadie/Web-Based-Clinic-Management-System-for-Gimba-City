import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {

    const roleRoutes = {
      patient: '/patient',
      doctor: '/doctor',
      receptionist: '/reception',
      lab_technician: '/lab',
      pharmacist: '/pharmacist',
      admin: '/admin'
    };
    
    const redirectPath = roleRoutes[user?.role] || '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
