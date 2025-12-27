import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../layout/Layout';
import DoctorHome from './DoctorHome';
import DoctorAppointments from './DoctorAppointments';
import DoctorPatients from './DoctorPatients';
import PatientDetail from './PatientDetail';
import DoctorMedicalNotes from './DoctorMedicalNotes';
import DoctorPrescriptions from './DoctorPrescriptions';
import DoctorLabRequests from './DoctorLabRequests';
import DoctorLabResults from './DoctorLabResults';
import { useAuth } from '../../contexts/AuthContext';
import { Loader } from 'lucide-react';

// Loading component for route transitions
const RouteLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader className="h-8 w-8 animate-spin text-primary-600" />
  </div>
);

// Error boundary component for individual routes
const RouteErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    // Reset error state when children change
    setHasError(false);
  }, [children]);

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">
            Component Error
          </div>
          <p className="text-gray-600 mb-4">
            There was a problem loading this page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return children;
};

const DoctorDashboard = () => {
  const { user, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Redirect if not authenticated or not a doctor
  if (!user || user.role !== 'doctor') {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Routes>
        <Route 
          index 
          element={
            <RouteErrorBoundary>
              <React.Suspense fallback={<RouteLoader />}>
                <DoctorHome />
              </React.Suspense>
            </RouteErrorBoundary>
          } 
        />
        <Route 
          path="appointments" 
          element={
            <RouteErrorBoundary>
              <React.Suspense fallback={<RouteLoader />}>
                <DoctorAppointments />
              </React.Suspense>
            </RouteErrorBoundary>
          } 
        />
        <Route 
          path="patients" 
          element={
            <RouteErrorBoundary>
              <React.Suspense fallback={<RouteLoader />}>
                <DoctorPatients />
              </React.Suspense>
            </RouteErrorBoundary>
          } 
        />
        <Route 
          path="patients/:patientId" 
          element={
            <RouteErrorBoundary>
              <React.Suspense fallback={<RouteLoader />}>
                <PatientDetail />
              </React.Suspense>
            </RouteErrorBoundary>
          } 
        />
        <Route 
          path="medical-notes" 
          element={
            <RouteErrorBoundary>
              <React.Suspense fallback={<RouteLoader />}>
                <DoctorMedicalNotes />
              </React.Suspense>
            </RouteErrorBoundary>
          } 
        />
        <Route 
          path="prescriptions" 
          element={
            <RouteErrorBoundary>
              <React.Suspense fallback={<RouteLoader />}>
                <DoctorPrescriptions />
              </React.Suspense>
            </RouteErrorBoundary>
          } 
        />
        <Route 
          path="lab-requests" 
          element={
            <RouteErrorBoundary>
              <React.Suspense fallback={<RouteLoader />}>
                <DoctorLabRequests />
              </React.Suspense>
            </RouteErrorBoundary>
          } 
        />
        <Route 
          path="lab-results" 
          element={
            <RouteErrorBoundary>
              <React.Suspense fallback={<RouteLoader />}>
                <DoctorLabResults />
              </React.Suspense>
            </RouteErrorBoundary>
          } 
        />
        {/* Catch-all route for 404 pages */}
        <Route path="*" element={<Navigate to="/doctor" replace />} />
      </Routes>
    </Layout>
  );
};

export default DoctorDashboard;