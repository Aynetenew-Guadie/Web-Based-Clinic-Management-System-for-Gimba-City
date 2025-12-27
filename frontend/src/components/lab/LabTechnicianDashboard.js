import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '../layout/Layout';
import LabHome from './LabHome';
import LabPendingTests from './LabPendingTests';
import LabInProgressTests from './LabInProgressTests';
import LabTestResults from './LabTestResults';

const LabTechnicianDashboard = () => {
  return (
    <Layout>
      <Routes>
        <Route index element={<LabHome />} />
        <Route path="pending-tests" element={<LabPendingTests />} />
        <Route path="in-progress-tests" element={<LabInProgressTests />} />
        <Route path="test-results" element={<LabTestResults />} />
      </Routes>
    </Layout>
  );
};

export default LabTechnicianDashboard;
