import React, { useState, useEffect } from 'react';
import { FlaskConical, User, Calendar, Plus, Loader, Search, Filter, Eye, Edit, X, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getLabRequests, createLabRequest, searchPatients, searchLabTechnicians, updateLabRequest } from '../../services/doctorService';
import toast from 'react-hot-toast';
import { getPatientName } from '../../utils/nameHelpers';

const DoctorLabRequests = () => {
  const { user } = useAuth();
  const [labRequests, setLabRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    patientId: '',
    testType: '',
    urgency: 'normal',
    notes: '',
    technicianId: ''
  });
  const [patients, setPatients] = useState([]);
  const [labTechnicians, setLabTechnicians] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // No inline mock data — component relies on backend via services

  const fetchLabRequests = async () => {
    try {
      setIsLoading(true);
      const labRequestsData = await getLabRequests();
      setLabRequests(labRequestsData || []);
    } catch (error) {
      console.error('Error fetching lab requests:', error);
      // Backend not available — show empty state and notify
      setLabRequests([]);
      toast.error('Failed to load lab requests from backend');
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
      // Backend not available — set empty and notify
      setPatients([]);
    }
  };

  const fetchLabTechnicians = async () => {
    try {
      const technicianData = await searchLabTechnicians();
      setLabTechnicians(technicianData || []);
    } catch (error) {
      console.error('Error fetching lab technicians:', error);
      // Backend not available — set empty list
      setLabTechnicians([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        await Promise.all([
          fetchLabRequests(),
          fetchPatients(),
          fetchLabTechnicians()
        ]);
      }
    };

    fetchData();
  }, [user]);

  const filteredRequests = labRequests.filter(request => {
    const testType = request.testType || '';
    const patientName = getPatientName(request);
    
    const matchesSearch = testType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (patientName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAddRequest = async (e) => {
    e.preventDefault();
    if (!newRequest.patientId || !newRequest.testType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData = {
        patientId: parseInt(newRequest.patientId),
        testType: newRequest.testType,
        urgency: newRequest.urgency,
        notes: newRequest.notes,
        technicianId: newRequest.technicianId ? parseInt(newRequest.technicianId) : null,
        // Ensure doctorId is sent so mock endpoints can persist who requested the test
        doctorId: user?.id || null
      };

      const data = await createLabRequest(requestData);
      
      // Add the new request to the state
      const addedRequest = {
        ...data,
        id: data.id || Date.now(),
        patient: patients.find(p => p.id === parseInt(newRequest.patientId)),
        technician: labTechnicians.find(t => t.id === parseInt(newRequest.technicianId)),
        doctor: data?.doctor || { id: user?.id, username: user?.username, name: user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() },
        createdAt: new Date().toISOString(),
        status: 'pending'
      };
      
      setLabRequests([addedRequest, ...labRequests]);
      setNewRequest({
        patientId: '',
        testType: '',
        urgency: 'normal',
        notes: '',
        technicianId: ''
      });
      setShowAddForm(false);
      toast.success('Lab request created successfully');
    } catch (error) {
      console.error('Error creating lab request:', error);
      toast.error('Failed to create lab request');
      setNewRequest({
        patientId: '',
        testType: '',
        urgency: 'normal',
        notes: '',
        technicianId: ''
      });
      setShowAddForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setSelectedRequest(null);
    setShowDetailsModal(false);
  };

  const handleEditRequest = (request) => {
    setEditingRequest(request);
    setNewRequest({
      patientId: request.patient?.id || request.patientId || '',
      testType: request.testType || '',
      urgency: request.urgency || 'normal',
      notes: request.notes || '',
      technicianId: request.technician?.id || request.technicianId || ''
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingRequest(null);
    setNewRequest({
      patientId: '',
      testType: '',
      urgency: 'normal',
      notes: '',
      technicianId: ''
    });
    setShowAddForm(false);
  };

  const handleUpdateRequest = async (e) => {
    e.preventDefault();
    if (!newRequest.patientId || !newRequest.testType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData = {
        patientId: parseInt(newRequest.patientId),
        testType: newRequest.testType,
        urgency: newRequest.urgency,
        notes: newRequest.notes,
        technicianId: newRequest.technicianId ? parseInt(newRequest.technicianId) : null
      };

      const updatedData = await updateLabRequest(editingRequest.id, updateData);
      setLabRequests(prev => prev.map(req => 
        req.id === editingRequest.id ? updatedData : req
      ));
      setNewRequest({
        patientId: '',
        testType: '',
        urgency: 'normal',
        notes: '',
        technicianId: ''
      });
      setEditingRequest(null);
      setShowAddForm(false);
      toast.success('Lab request updated successfully');
    } catch (error) {
      console.error('Error updating lab request:', error);
      toast.error('Failed to update lab request');
      setNewRequest({
        patientId: '',
        testType: '',
        urgency: 'normal',
        notes: '',
        technicianId: ''
      });
      setEditingRequest(null);
      setShowAddForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    }
  };

  const getPriorityColor = (urgency) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-2xl font-bold text-gray-900">Lab Requests</h1>
          <p className="text-gray-600">Manage laboratory test requests</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary flex items-center space-x-2"
          disabled={isSubmitting}
        >
          <Plus className="h-4 w-4" />
          <span>{showAddForm ? 'Cancel' : 'New Request'}</span>
        </button>
      </div>

      {/* Add/Edit Lab Request Form */}
      {showAddForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingRequest ? 'Edit Lab Request' : 'Create New Lab Request'}
          </h3>
          <form onSubmit={editingRequest ? handleUpdateRequest : handleAddRequest} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient *
                </label>
                <select
                  value={newRequest.patientId}
                  onChange={(e) => setNewRequest({...newRequest, patientId: e.target.value})}
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
                {patients.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    No patients found. Contact admin to create patient accounts.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Type *
                </label>
                <input
                  type="text"
                  value={newRequest.testType}
                  onChange={(e) => setNewRequest({...newRequest, testType: e.target.value})}
                  className="input-field"
                  placeholder="e.g., Complete Blood Count (CBC)"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lab Technician (Optional)
                </label>
                <select
                  value={newRequest.technicianId}
                  onChange={(e) => setNewRequest({...newRequest, technicianId: e.target.value})}
                  className="input-field"
                  disabled={isSubmitting}
                >
                  <option value="">Auto-assign technician</option>
                  {labTechnicians.map(tech => (
                    <option key={tech.id} value={tech.id}>
                      {tech.username} - {tech.first_name} {tech.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Urgency
                </label>
                <select
                  value={newRequest.urgency}
                  onChange={(e) => setNewRequest({...newRequest, urgency: e.target.value})}
                  className="input-field"
                  disabled={isSubmitting}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={newRequest.notes}
                onChange={(e) => setNewRequest({...newRequest, notes: e.target.value})}
                className="input-field"
                rows={3}
                placeholder="Additional notes or instructions for the lab..."
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={cancelEdit}
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
                ) : editingRequest ? (
                  <Save className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>
                  {isSubmitting ? 'Submitting...' : 
                   editingRequest ? 'Update Request' : 'Create Request'}
                </span>
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
              placeholder="Search requests by test type or patient..."
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
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Lab Requests List */}
      <div className="space-y-4">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((request) => (
            <div key={request.id} className="card">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FlaskConical className="h-6 w-6 text-purple-600" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {request.testType || 'Test Name N/A'}
                    </h3>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                        {getStatusText(request.status)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(request.urgency)}`}>
                        {request.urgency?.charAt(0).toUpperCase() + request.urgency?.slice(1) || 'Normal'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-600">Patient: </span>
                        <span className="font-medium">{getPatientName(request)}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Date: </span>
                        <span className="font-medium">
                          {formatDate(request.createdAt || request.date)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-600">Urgency: </span>
                        <span className="font-medium capitalize">
                          {request.urgency || 'normal'}
                        </span>
                      </div>
                      {request.notes && (
                        <div className="text-sm">
                          <span className="text-gray-600">Notes: </span>
                          <span className="font-medium line-clamp-1">{request.notes}</span>
                        </div>
                      )}
                      {request.technician && (
                        <div className="text-sm">
                          <span className="text-gray-600">Technician: </span>
                          <span className="font-medium">
                            {request.technician.username}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <button 
                    onClick={() => handleEditRequest(request)}
                    className="btn-secondary text-sm px-3 py-1 flex items-center space-x-1"
                    disabled={isSubmitting}
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button 
                    onClick={() => handleViewDetails(request)}
                    className="btn-primary text-sm px-3 py-1 flex items-center space-x-1"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <FlaskConical className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'No lab requests found' : 'No lab requests available'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== 'all'
                ? 'No lab requests match your current search criteria.'
                : 'Start by creating your first lab request for a patient.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Lab Request Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Lab Request Details</h2>
                <button 
                  onClick={closeDetailsModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Request Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-600 font-medium">Test Type: </span>
                        <span className="text-gray-800">{selectedRequest.testType}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Patient: </span>
                        <span className="text-gray-800">
                          {getPatientName(selectedRequest)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Urgency: </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(selectedRequest.urgency)}`}>
                          {selectedRequest.urgency?.charAt(0).toUpperCase() + selectedRequest.urgency?.slice(1) || 'Normal'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Status & Timeline</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-600 font-medium">Status: </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedRequest.status)}`}>
                          {getStatusText(selectedRequest.status)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Date Requested: </span>
                        <span className="text-gray-800">{formatDate(selectedRequest.createdAt || selectedRequest.date)}</span>
                      </div>
                      {selectedRequest.technician && (
                        <div>
                          <span className="text-gray-600 font-medium">Technician: </span>
                          <span className="text-gray-800">
                            {selectedRequest.technician.username} - {selectedRequest.technician.first_name} {selectedRequest.technician.last_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedRequest.notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedRequest.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button 
                  onClick={() => {
                    closeDetailsModal();
                    handleEditRequest(selectedRequest);
                  }}
                  className="btn-secondary flex items-center space-x-2"
                  disabled={isSubmitting}
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Request</span>
                </button>
                <button 
                  onClick={closeDetailsModal}
                  className="btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorLabRequests;