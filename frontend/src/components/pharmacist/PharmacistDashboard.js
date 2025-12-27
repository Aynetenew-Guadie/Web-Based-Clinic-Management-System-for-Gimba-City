import React, { useState, useEffect, useRef } from 'react';
import { getPrescriptions, dispensePrescription, getPatient, updatePatient, listDrugs, addDrug } from '../../services/pharmacistService';
import toast from 'react-hot-toast';
import { getPatientName, getDoctorName } from '../../utils/nameHelpers';

import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../layout/Layout';

const PharmacistHome = ({
  prescriptions,
  isLoading,
  query,
  setQuery,
  drugsList,
  setShowAddDrug,
  fetchPrescriptions,
  handleDispense,
  openEditPatient,
  showEditPatient,
  selectedPatient,
  patientForm,
  setPatientForm,
  setShowEditPatient,
  savePatient,
  showAddDrug,
  drugForm,
  setDrugForm,
  fetchDrugs,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pharmacist Dashboard</h1>
        <p className="text-gray-600">View prescriptions prescribed by doctors and dispense medications to patients.</p>
      </div>

      <div className="card">
        <div className="flex items-center space-x-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="input-field"
            placeholder="Search prescriptions by medication..."
          />
          <button onClick={fetchPrescriptions} className="btn-secondary">Search</button>
          <div className="ml-auto flex items-center space-x-2">
            <button onClick={() => setShowAddDrug(true)} className="btn-secondary">Add Drug</button>
            <button onClick={fetchDrugs} className="btn-secondary">Refresh Drugs</button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="card text-center py-12">Loading...</div>
        ) : prescriptions.length === 0 ? (
          <div className="card text-center py-12">No prescriptions to display</div>
        ) : (
          prescriptions.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{p.medication || 'Medication'}</h3>
                  <div className="text-sm text-gray-600">Patient: {getPatientName(p)}</div>
                  <div className="text-sm text-gray-500">Prescribed by: {getDoctorName(p)}</div>
                  {p.instructions && <div className="text-sm text-gray-500">Notes: {p.instructions}</div>}
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => handleDispense(p.id)} className="btn-primary">Give Drug</button>
                  <button onClick={() => openEditPatient(p.patient?.id)} className="btn-secondary">Edit Patient</button>
                </div>
              </div>

              {/* show basic drug list */}
              {drugsList.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-600">Inventory</h4>
                  <ul className="text-sm text-gray-700">
                    {drugsList.map(d => (
                      <li key={d.id}>{d.name} {d.sku ? `(${d.sku})` : ''} — Qty: {d.quantity}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const PharmacistDashboard = () => {
  // keep the existing stateful logic here and pass into PharmacistHome and also to nested route(s)
  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');

  const isFetchingRef = useRef(false);

  const fetchPrescriptions = async () => {
    if (isFetchingRef.current) return; // avoid duplicate requests (React StrictMode/dev double-invoke)
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const data = await getPrescriptions({ status: 'prescribed', q: query });
      setPrescriptions(data || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      toast.error(error?.message || 'Failed to load prescriptions');
      setPrescriptions([]);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }

  useEffect(() => {
    fetchPrescriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [patientForm, setPatientForm] = useState({});

  // Drug inventory state
  const [showAddDrug, setShowAddDrug] = useState(false);
  const [drugForm, setDrugForm] = useState({ name: '', sku: '', quantity: 0 });
  const [drugsList, setDrugsList] = useState([]);

  const fetchDrugs = async () => {
    try {
      const d = await listDrugs();
      setDrugsList(d.data || d || []);
    } catch (error) {
      console.error('Failed to load drugs:', error);
    }
  }

  useEffect(() => {
    fetchDrugs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEditPatient = async (patientId) => {
    try {
      const data = await getPatient(patientId);
      setSelectedPatient(data.data || data);
      setPatientForm({
        first_name: data.data?.first_name || data.first_name || '',
        last_name: data.data?.last_name || data.last_name || '',
        email: data.data?.email || data.email || '',
        phone: data.data?.phone || data.phone || '',
        address: data.data?.address || data.address || '',
        gender: data.data?.gender || data.gender || '',
        date_of_birth: data.data?.date_of_birth || data.date_of_birth || ''
      });
      setShowEditPatient(true);
    } catch (error) {
      toast.error('Failed to load patient');
    }
  }

  const savePatient = async () => {
    if (!selectedPatient) return;
    try {
      await updatePatient(selectedPatient.id, patientForm);
      toast.success('Patient updated');
      setShowEditPatient(false);
      // Refresh prescriptions list
      fetchPrescriptions();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update patient');
    }
  }

  const handleDispense = async (prescriptionId) => {
    try {
      await dispensePrescription(prescriptionId);
      toast.success('Prescription dispensed');
      // Refresh list
      fetchPrescriptions();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to dispense');
    }
  }

  return (
    <Layout>
      <Routes>
        <Route index element={<PharmacistHome
          prescriptions={prescriptions}
          isLoading={isLoading}
          query={query}
          setQuery={setQuery}
          drugsList={drugsList}
          setShowAddDrug={setShowAddDrug}
          fetchPrescriptions={fetchPrescriptions}
          handleDispense={handleDispense}
          openEditPatient={openEditPatient}
          showEditPatient={showEditPatient}
          selectedPatient={selectedPatient}
          patientForm={patientForm}
          setPatientForm={setPatientForm}
          setShowEditPatient={setShowEditPatient}
          savePatient={savePatient}
          showAddDrug={showAddDrug}
          drugForm={drugForm}
          setDrugForm={setDrugForm}
          fetchDrugs={fetchDrugs}
        /> } />
        <Route path="prescriptions" element={<PharmacistHome
          prescriptions={prescriptions}
          isLoading={isLoading}
          query={query}
          setQuery={setQuery}
          drugsList={drugsList}
          setShowAddDrug={setShowAddDrug}
          fetchPrescriptions={fetchPrescriptions}
          handleDispense={handleDispense}
          openEditPatient={openEditPatient}
          showEditPatient={showEditPatient}
          selectedPatient={selectedPatient}
          patientForm={patientForm}
          setPatientForm={setPatientForm}
          setShowEditPatient={setShowEditPatient}
          savePatient={savePatient}
          showAddDrug={showAddDrug}
          drugForm={drugForm}
          setDrugForm={setDrugForm}
          fetchDrugs={fetchDrugs}
        /> } />
        <Route path="*" element={<Navigate to="/pharmacist" replace />} />
      </Routes>
    </Layout>
  );
}

export default PharmacistDashboard;