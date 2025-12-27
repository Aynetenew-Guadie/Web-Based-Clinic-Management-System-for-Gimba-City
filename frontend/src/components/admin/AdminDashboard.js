import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '../layout/Layout';
import AdminHome from './AdminHome';
import AdminUsers from './AdminUsers';
import AdminBilling from './AdminBilling';
import AdminSettings from './AdminSettings';

const AdminDashboard = () => {
  return (
    <Layout>
      <Routes>
        <Route index element={<AdminHome />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="billing" element={<AdminBilling />} />
        <Route path="settings" element={<AdminSettings />} />
      </Routes>
    </Layout>
  );
};

export default AdminDashboard;
