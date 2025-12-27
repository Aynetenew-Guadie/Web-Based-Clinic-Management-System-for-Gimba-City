import React, { useState, useEffect } from 'react';
import { Pill, User, Calendar, Plus, Loader, Search, Filter, Eye, FileText, Edit, X, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createPrescription, getPrescriptions, searchPatients, updatePrescription } from '../../services/doctorService';
import toast from 'react-hot-toast';

const DoctorPrescriptions = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPrescription, setNewPrescription] = useState({
    patientId: '',
    medication: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    status: 'active'
  });
  const [patients, setPatients] = useState([]);
  const [editing, setEditing] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // No inline mock data — patients and prescriptions are fetched from backend

  const fetchPrescriptions = async () => {
    try {
      setIsLoading(true);
      const prescriptionsData = await getPrescriptions();
      setPrescriptions(prescriptionsData || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      // Backend not available — set empty list and notify
      setPrescriptions([]);
      toast.error('Failed to load prescriptions from backend');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const patientsData = await searchPatients('');
      setPatients(patientsData || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      // Backend not available — set empty list
      setPatients([]);
      toast.error('Failed to load patients for prescriptions');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        await Promise.all([fetchPrescriptions(), fetchPatients()]);
      }
    };

    fetchData();
  }, [user]);

  const filteredPrescriptions = prescriptions.filter(prescription => {
    const patientName = prescription.patient?.username || 
                       (prescription.patient?.first_name && prescription.patient?.last_name 
                         ? `${prescription.patient.first_name} ${prescription.patient.last_name}`
                         : 'Unknown Patient');
    
    const matchesSearch = prescription.medication?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || prescription.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAddPrescription = async (e) => {
    e.preventDefault();
    if (!newPrescription.patientId || !newPrescription.medication || !newPrescription.dosage) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const prescriptionData = {
        patientId: parseInt(newPrescription.patientId),
        medication: newPrescription.medication,
        dosage: newPrescription.dosage,
        frequency: newPrescription.frequency,
        duration: newPrescription.duration,
        instructions: newPrescription.instructions,
        status: newPrescription.status
      };

      const response = await createPrescription(prescriptionData);
      
      // Add the new prescription to the state
      const addedPrescription = {
        ...response,
        id: response.id || Date.now(),
        patient: patients.find(p => p.id === parseInt(newPrescription.patientId)),
        dateIssued: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      setPrescriptions([addedPrescription, ...prescriptions]);
      setNewPrescription({
        patientId: '',
        medication: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        status: 'active'
      });
      setShowAddForm(false);
      toast.success('Prescription issued successfully');
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast.error('Failed to issue prescription');
      setNewPrescription({
        patientId: '',
        medication: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        status: 'active'
      });
      setShowAddForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (prescription) => {
    setEditing({
      id: prescription.id,
      patientId: prescription.patient?.id || prescription.patientId,
      medication: prescription.medication || '',
      dosage: prescription.dosage || '',
      frequency: prescription.frequency || '',
      duration: prescription.duration || '',
      instructions: prescription.instructions || '',
      status: prescription.status || 'active'
    });
    setShowAddForm(false);
  };

  const handleCancelEdit = () => {
    setEditing(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editing?.id) return;

    setIsSubmitting(true);
    try {
      const updateData = {
        patientId: editing.patientId,
        medication: editing.medication,
        dosage: editing.dosage,
        frequency: editing.frequency,
        duration: editing.duration,
        instructions: editing.instructions,
        status: editing.status,
      };

      const updated = await updatePrescription(editing.id, updateData);
      setPrescriptions((prev) => prev.map(p => p.id === updated.id ? updated : p));
      setEditing(null);
      toast.success('Prescription updated successfully');
    } catch (error) {
      console.error('Error updating prescription:', error);
      toast.error('Failed to update prescription');
      setEditing(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'discontinued':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'discontinued':
        return 'Discontinued';
      case 'expired':
        return 'Expired';
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
          <p className="text-gray-600">Manage patient prescriptions</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary flex items-center space-x-2"
          disabled={isSubmitting}
        >
          <Plus className="h-4 w-4" />
          <span>{showAddForm ? 'Cancel' : 'Issue Prescription'}</span>
        </button>
      </div>

      {/* Add Prescription Form */}
      {showAddForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Issue New Prescription</h3>
          <form onSubmit={handleAddPrescription} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient *
                </label>
                <select
                  value={newPrescription.patientId}
                  onChange={(e) => setNewPrescription({...newPrescription, patientId: e.target.value})}
                  className="input-field"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select a patient</option>
                  {patients.map(patient => {
                    const name = patient ? ((patient.first_name || patient.last_name) ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() : null) : null;
                    const label = patient ? (patient.username || name || patient.email || `ID:${patient.patientId || patient.id}`) : 'Unknown';
                    return (
                      <option key={patient.id} value={patient.id}>{label}</option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medication *
                </label>
                <input
                  type="text"
                  value={newPrescription.medication}
                  onChange={(e) => setNewPrescription({...newPrescription, medication: e.target.value})}
                  className="input-field"
                  placeholder="e.g., Amoxicillin 500mg"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dosage *
                </label>
                <input
                  type="text"
                  value={newPrescription.dosage}
                  onChange={(e) => setNewPrescription({...newPrescription, dosage: e.target.value})}
                  className="input-field"
                  placeholder="e.g., 1 capsule"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency *
                </label>
                <input
                  type="text"
                  value={newPrescription.frequency}
                  onChange={(e) => setNewPrescription({...newPrescription, frequency: e.target.value})}
                  className="input-field"
                  placeholder="e.g., 3 times daily"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration *
                </label>
                <input
                  type="text"
                  value={newPrescription.duration}
                  onChange={(e) => setNewPrescription({...newPrescription, duration: e.target.value})}
                  className="input-field"
                  placeholder="e.g., 7 days"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructions
              </label>
              <textarea
                value={newPrescription.instructions}
                onChange={(e) => setNewPrescription({...newPrescription, instructions: e.target.value})}
                className="input-field"
                rows={3}
                placeholder="Additional instructions for the patient..."
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary flex items-center space-x-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>{isSubmitting ? 'Issuing...' : 'Issue Prescription'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Prescription Form */}
      {editing && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Prescription</h3>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
                <select
                  value={editing.patientId}
                  onChange={(e) => setEditing({ ...editing, patientId: e.target.value })}
                  className="input-field"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select a patient</option>
                  {patients.map(patient => {
                    const name = patient ? ((patient.first_name || patient.last_name) ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() : null) : null;
                    const label = patient ? (patient.username || name || patient.email || `ID:${patient.patientId || patient.id}`) : 'Unknown';
                    return (
                      <option key={patient.id} value={patient.id}>{label}</option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medication *</label>
                <input
                  type="text"
                  value={editing.medication}
                  onChange={(e) => setEditing({ ...editing, medication: e.target.value })}
                  className="input-field"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dosage *</label>
                <input
                  type="text"
                  value={editing.dosage}
                  onChange={(e) => setEditing({ ...editing, dosage: e.target.value })}
                  className="input-field"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
                <input
                  type="text"
                  value={editing.frequency}
                  onChange={(e) => setEditing({ ...editing, frequency: e.target.value })}
                  className="input-field"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration *</label>
                <input
                  type="text"
                  value={editing.duration}
                  onChange={(e) => setEditing({ ...editing, duration: e.target.value })}
                  className="input-field"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
              <textarea
                value={editing.instructions}
                onChange={(e) => setEditing({ ...editing, instructions: e.target.value })}
                className="input-field"
                rows={3}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  className="input-field"
                  disabled={isSubmitting}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="discontinued">Discontinued</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={handleCancelEdit} 
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary flex items-center space-x-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search prescriptions by medication or patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="discontinued">Discontinued</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="space-y-4">
        {filteredPrescriptions.length > 0 ? (
          filteredPrescriptions.map((prescription) => (
            <div key={prescription.id} className="card">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Pill className="h-6 w-6 text-green-600" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {prescription.medication || 'Medication Name N/A'}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(prescription.status)}`}>
                      {getStatusText(prescription.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-600">Patient: </span>
                        <span className="font-medium">
                          {prescription.patient?.username || 
                           (prescription.patient?.first_name && prescription.patient?.last_name 
                             ? `${prescription.patient.first_name} ${prescription.patient.last_name}`
                             : 'Unknown Patient')}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Dosage: </span>
                        <span className="font-medium">
                          {prescription.dosage || 'Not specified'}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Frequency: </span>
                        <span className="font-medium">
                          {prescription.frequency || 'Not specified'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-600">Duration: </span>
                        <span className="font-medium">
                          {prescription.duration || 'Not specified'}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Date Issued: </span>
                        <span className="font-medium">
                          {formatDate(prescription.dateIssued || prescription.createdAt)}
                        </span>
                      </div>
                      {prescription.instructions && (
                        <div className="text-sm">
                          <span className="text-gray-600">Instructions: </span>
                          <span className="font-medium">{prescription.instructions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <button 
                    onClick={() => handleStartEdit(prescription)} 
                    className="btn-secondary text-sm px-3 py-1 flex items-center space-x-1"
                    disabled={isSubmitting}
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'No prescriptions found' : 'No prescriptions available'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== 'all'
                ? 'No prescriptions match your current search criteria.'
                : 'Start by issuing your first prescription for a patient.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorPrescriptions;