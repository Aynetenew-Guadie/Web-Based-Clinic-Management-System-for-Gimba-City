import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../layout/Layout';
import PatientHome from './PatientHome';
import PatientProfile from './PatientProfile';
import PatientAppointments from './PatientAppointments';
import PatientAppointmentRequests from './PatientAppointmentRequests';
import PatientMedicalRecords from './PatientMedicalRecords';
import PatientPrescriptions from './PatientPrescriptions';
import PatientLabResults from './PatientLabResults';
import PatientBilling from './PatientBilling';

const PatientDashboard = () => {
  return (
    <Layout>
      <Routes>
        <Route index element={<PatientHome />} />
        <Route path="profile" element={<PatientProfile />} />
        <Route path="appointments" element={<PatientAppointments />} />
        <Route path="appointment-requests" element={<PatientAppointmentRequests />} />
        <Route path="medical-records" element={<PatientMedicalRecords />} />
        <Route path="prescriptions" element={<PatientPrescriptions />} />
        <Route path="lab-results" element={<PatientLabResults />} />
        <Route path="billing" element={<PatientBilling />} />
        
        {/* Handle unknown routes gracefully */}
        <Route path="*" element={<Navigate to="/patient" replace />} />
      </Routes>
    </Layout>
  );
};

export default PatientDashboard;