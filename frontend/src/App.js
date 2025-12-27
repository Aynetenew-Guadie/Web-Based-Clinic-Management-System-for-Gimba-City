import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/public/LandingPage';
import AboutPage from './components/public/AboutPage';
import ServicesPage from './components/public/ServicesPage';
import ContactPage from './components/public/ContactPage';
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import Dashboard from './components/dashboard/Dashboard';
import PatientDashboard from './components/patient/PatientDashboard';
import DoctorDashboard from './components/doctor/DoctorDashboard';
import ReceptionistDashboard from './components/receptionist/ReceptionistDashboard';
import LabTechnicianDashboard from './components/lab/LabTechnicianDashboard';
import PharmacistDashboard from './components/pharmacist/PharmacistDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import BackButton from './components/common/BackButton';

// Create router configuration with future flags
const routerConfig = [
  // Public Routes
  { path: '/', element: <LandingPage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '/services', element: <ServicesPage /> },
  { path: '/contact', element: <ContactPage /> },
  
  // Auth Routes
  { path: '/login', element: <Login /> },
  // Conditionally show self-service reset routes only when allowed by env flag
  ...(process.env.REACT_APP_ADMIN_ONLY_PASSWORD_RESET === 'true' ? [] : [
    { path: '/forgot-password', element: <ForgotPassword /> },
    { path: '/reset-password/:token', element: <ResetPassword /> }
  ]),
  
  // Protected Routes
  { 
    path: '/dashboard', 
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ) 
  },
  { 
    path: '/patient/*', 
    element: (
      <ProtectedRoute requiredRole="patient">
        <PatientDashboard />
      </ProtectedRoute>
    ) 
  },
  { 
    path: '/doctor/*', 
    element: (
      <ProtectedRoute requiredRole="doctor">
        <DoctorDashboard />
      </ProtectedRoute>
    ) 
  },
  { 
    path: '/reception/*', 
    element: (
      <ProtectedRoute requiredRole="receptionist">
        <ReceptionistDashboard />
      </ProtectedRoute>
    ) 
  },
  { 
    path: '/lab/*', 
    element: (
      <ProtectedRoute requiredRole="lab_technician">
        <LabTechnicianDashboard />
      </ProtectedRoute>
    ) 
  },
  { 
    path: '/pharmacist/*', 
    element: (
      <ProtectedRoute requiredRole="pharmacist">
        <PharmacistDashboard />
      </ProtectedRoute>
    ) 
  },
  { 
    path: '/admin/*', 
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminDashboard />
      </ProtectedRoute>
    ) 
  },
  
  // Fallback route - redirect to home
  { path: '*', element: <Navigate to="/" replace /> }
];

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {routerConfig.map((route, index) => (
        <Route key={index} path={route.path} element={route.element} />
      ))}
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <div className="App min-h-screen bg-gray-50">
          {/* Global back button (fixed centered at top) */}
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
            <BackButton />
          </div>

          <AppRoutes />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;