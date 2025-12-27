import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, 
  User, 
  Calendar, 
  FileText, 
  Pill, 
  FlaskConical, 
  CreditCard, 
  Settings, 
  LogOut,
  Users,
  BarChart3,
  Clock
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const getNavItems = () => {
    switch (user?.role) {
      case 'patient':
        return [
          { path: '/patient', label: 'Dashboard', icon: Home },
          { path: '/patient/profile', label: 'Profile', icon: User },
          { path: '/patient/appointments', label: 'Appointments', icon: Calendar },
          { path: '/patient/appointment-requests', label: 'Appointment Requests', icon: Clock },
          { path: '/patient/medical-records', label: 'Medical Records', icon: FileText },
          { path: '/patient/prescriptions', label: 'Prescriptions', icon: Pill },
          { path: '/patient/lab-results', label: 'Lab Results', icon: FlaskConical },
          { path: '/patient/billing', label: 'Billing', icon: CreditCard },
        ];
      case 'doctor':
        return [
          { path: '/doctor', label: 'Dashboard', icon: Home },
          { path: '/doctor/appointments', label: 'Appointments', icon: Calendar },
          { path: '/doctor/patients', label: 'Patients', icon: Users },
          { path: '/doctor/medical-notes', label: 'Medical Notes', icon: FileText },
          { path: '/doctor/prescriptions', label: 'Prescriptions', icon: Pill },
          { path: '/doctor/lab-requests', label: 'Lab Requests', icon: FlaskConical },
          { path: '/doctor/lab-results', label: 'Lab Results', icon: FileText },
        ];
      case 'receptionist':
        return [
          { path: '/reception', label: 'Dashboard', icon: Home },
          { path: '/reception/patients', label: 'Patients', icon: Users },
          { path: '/reception/appointments', label: 'Appointments', icon: Calendar },
          { path: '/reception/queue', label: 'Patient Queue', icon: BarChart3 },
          { path: '/reception/billing', label: 'Billing', icon: CreditCard },
        ];
      case 'lab_technician':
        return [
          { path: '/lab', label: 'Dashboard', icon: Home },
          { path: '/lab/pending-tests', label: 'Pending Tests', icon: FlaskConical },
          { path: '/lab/in-progress-tests', label: 'In-Progress Tests', icon: Clock },
          { path: '/lab/test-results', label: 'Test Results', icon: FileText },
        ];
      case 'pharmacist':
        return [
          { path: '/pharmacist', label: 'Dashboard', icon: Home },
          { path: '/pharmacist/prescriptions', label: 'Prescriptions', icon: Pill },
        ];
      case 'admin':
        return [
          { path: '/admin', label: 'Dashboard', icon: Home },
          { path: '/admin/users', label: 'User Management', icon: Users },
          { path: '/admin/billing', label: 'Billing Overview', icon: CreditCard },
          { path: '/admin/settings', label: 'Settings', icon: Settings },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    logout(); 
    navigate('/'); 
    setIsLoggingOut(false);
  };

  return (
    <div className="bg-white shadow-lg w-64 min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Clinic MS</h1>
            <p className="text-sm text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                          (item.path !== '/patient' && item.path !== '/doctor' && 
                           item.path !== '/reception' && item.path !== '/lab' && 
                           item.path !== '/admin' && location.pathname.startsWith(item.path));
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 px-4 py-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-medium text-sm">
              {user?.username?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.username || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut className={`h-5 w-5 ${isLoggingOut ? 'animate-spin' : ''}`} />
          <span className="font-medium">{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
