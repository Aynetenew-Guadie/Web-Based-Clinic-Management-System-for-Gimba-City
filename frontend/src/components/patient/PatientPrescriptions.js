import React, { useState, useEffect } from 'react';
import { Pill, Calendar, User, Clock, Loader, Search, Filter, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getPrescriptions, getPrescriptionDetails } from '../../services/patientService';
import { toast } from 'react-hot-toast';

const PatientPrescriptions = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);

  // No inline mock data — prescriptions fetched from backend via service

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        setIsLoading(true);
        const data = await getPrescriptions();
        setPrescriptions(data || []);
      } catch (error) {
        console.error('Error fetching prescriptions:', error);
        toast.error('Failed to load prescriptions from backend');
        setPrescriptions([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchPrescriptions();
    }
  }, [user]);

  const openPrescription = async (prescriptionId) => {
    try {
      const resp = await getPrescriptionDetails(prescriptionId);
      setSelectedPrescription(resp.data || resp);
      setShowPrescriptionModal(true);
    } catch (error) {
      toast.error('Failed to load prescription details');
    }
  };

  const closePrescription = () => {
    setSelectedPrescription(null);
    setShowPrescriptionModal(false);
  };

  const filteredPrescriptions = prescriptions.filter(prescription => {
    const matchesSearch = prescription.medication?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prescription.doctor?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prescription.doctor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prescription.instructions?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prescription.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || prescription.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'dispensed':
        return 'bg-indigo-100 text-indigo-800';
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
      case 'pending':
        return 'Pending';
      case 'dispensed':
        return 'Dispensed';
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    }
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleRefillRequest = (prescription) => {
    toast.success(`Refill request sent for ${prescription.medication}`);
    // In a real app, this would call an API to request a refill
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your prescriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
          <p className="text-gray-600">View your current and past prescriptions</p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredPrescriptions.length} of {prescriptions.length} prescriptions
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search prescriptions by medication, doctor, or instructions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field min-w-[150px]"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="discontinued">Discontinued</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            {(searchTerm || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                }}
                className="btn-secondary text-sm px-3 py-2"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Demo notice removed - prescriptions load from backend */}

      <div className="space-y-4">
        {filteredPrescriptions.length > 0 ? (
          <>
            {filteredPrescriptions.map((prescription) => {
            const expired = isExpired(prescription.expiry_date);
            const daysRemaining = getDaysRemaining(prescription.expiry_date);
            
            return (
              <div key={prescription.id} className="card hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Pill className="h-6 w-6 text-green-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{prescription.medication || 'Medication Name N/A'}</h3>
                        {prescription.notes && <p className="text-sm text-gray-600 mt-1">{prescription.notes}</p>}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(prescription.status)}`}>
                          {getStatusText(prescription.status)}
                        </span>
                        {prescription.expiry_date && isExpired(prescription.expiry_date) && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center space-x-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>Expired</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <User className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{prescription.doctor?.username || prescription.doctor?.name || prescription.doctor || 'Unknown Doctor'}</span>
                        </div>
                        <div className="mt-2">
                          <button onClick={() => openPrescription(prescription.id)} className="btn-secondary text-sm px-3 py-2">View Details</button>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>Prescribed: {new Date(prescription.date || prescription.createdAt || prescription.prescribed_date).toLocaleDateString()}</span>
                        </div>
                        {prescription.expiry_date && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span>Expires: {new Date(prescription.expiry_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        {prescription.dosage && (<div className="text-sm"><span className="text-gray-600 font-medium">Dosage: </span><span className="text-gray-800">{prescription.dosage}</span></div>)}
                        {prescription.frequency && (<div className="text-sm"><span className="text-gray-600 font-medium">Frequency: </span><span className="text-gray-800">{prescription.frequency}</span></div>)}
                        {prescription.duration && (<div className="text-sm"><span className="text-gray-600 font-medium">Duration: </span><span className="text-gray-800">{prescription.duration}</span></div>)}
                      </div>
                    </div>

                    {prescription.instructions && (
                      <div className="mb-3 pt-3 border-t border-gray-200"><div className="text-sm"><span className="text-gray-600 font-medium">Instructions: </span><span className="text-gray-800">{prescription.instructions}</span></div></div>
                    )}

                    <div className="mb-3 pt-3 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {prescription.quantity && (<div><span className="text-gray-600 font-medium">Quantity: </span><span className="text-gray-800">{prescription.quantity}</span></div>)}
                        {(prescription.refills !== undefined && prescription.refills !== null) && (<div><span className="text-gray-600 font-medium">Refills: </span><span className="text-gray-800">{prescription.refills} remaining</span></div>)}
                        {prescription.pharmacy && (<div><span className="text-gray-600 font-medium">Pharmacy: </span><span className="text-gray-800">{prescription.pharmacy}</span></div>)}

                        {prescription.status === 'dispensed' && (
                          <div>
                            <span className="text-gray-600 font-medium">Dispensed By: </span>
                            <span className="text-gray-800">{prescription.dispenser?.first_name ? `${prescription.dispenser.first_name} ${prescription.dispenser.last_name || ''}` : (prescription.dispenser?.username || 'Pharmacist')}</span>
                            {prescription.date_dispensed && (<div className="text-sm text-gray-500">On: {new Date(prescription.date_dispensed).toLocaleDateString()}</div>)}
                          </div>
                        )}
                      </div>
                    </div>

                    {prescription.warnings && (
                      <div className="pt-3 border-t border-gray-200"><div className="text-sm"><span className="text-gray-600 font-medium">Warnings: </span><span className="text-red-600">{prescription.warnings}</span></div></div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 flex-shrink-0">
                    {prescription.status === 'active' && !isExpired(prescription.expiry_date) && prescription.refills > 0 && (
                      <button 
                        onClick={() => handleRefillRequest(prescription)}
                        className="btn-primary text-sm px-3 py-2 whitespace-nowrap"
                      >
                        Request Refill
                      </button>
                    )}
                    {prescription.status === 'active' && isExpired(prescription.expiry_date) && (
                      <button 
                        onClick={() => toast.info('Please contact your doctor for a new prescription')}
                        className="btn-secondary text-sm px-3 py-2 whitespace-nowrap"
                      >
                        Expired - Contact Doctor
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Pill className="h-6 w-6 text-green-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {prescription.medication || 'Medication Name N/A'}
                        </h3>
                        {prescription.notes && (
                          <p className="text-sm text-gray-600 mt-1">{prescription.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(prescription.status)}`}>
                          {getStatusText(prescription.status)}
                        </span>
                        {prescription.expiry_date && expired && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center space-x-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>Expired</span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <User className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {prescription.doctor?.username || prescription.doctor?.name || prescription.doctor || 'Unknown Doctor'}
                          </span>
                        </div>
                        <div className="mt-2">
                          <button onClick={() => openPrescription(prescription.id)} className="btn-secondary text-sm px-3 py-2">View Details</button>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>
                            Prescribed: {new Date(prescription.date || prescription.createdAt || prescription.prescribed_date).toLocaleDateString()}
                          </span>
                        </div>
                        {prescription.expiry_date && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span>
                              Expires: {new Date(prescription.expiry_date).toLocaleDateString()}
                              {!expired && daysRemaining > 0 && (
                                <span className={`ml-2 font-medium ${daysRemaining <= 7 ? 'text-red-600' : 'text-blue-600'}`}>
                                  ({daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {prescription.dosage && (
                          <div className="text-sm">
                            <span className="text-gray-600 font-medium">Dosage: </span>
                            <span className="text-gray-800">{prescription.dosage}</span>
                          </div>
                        )}
                        {prescription.frequency && (
                          <div className="text-sm">
                            <span className="text-gray-600 font-medium">Frequency: </span>
                            <span className="text-gray-800">{prescription.frequency}</span>
                          </div>
                        )}
                        {prescription.duration && (
                          <div className="text-sm">
                            <span className="text-gray-600 font-medium">Duration: </span>
                            <span className="text-gray-800">{prescription.duration}</span>
                          </div>
                        )}
                      </div>
                    </div>
                      
                      <div className="space-y-2">
                        {prescription.dosage && (
                          <div className="text-sm">
                            <span className="text-gray-600 font-medium">Dosage: </span>
                            <span className="text-gray-800">{prescription.dosage}</span>
                          </div>
                        )}
                        {prescription.frequency && (
                          <div className="text-sm">
                            <span className="text-gray-600 font-medium">Frequency: </span>
                            <span className="text-gray-800">{prescription.frequency}</span>
                          </div>
                        )}
                        {prescription.duration && (
                          <div className="text-sm">
                            <span className="text-gray-600 font-medium">Duration: </span>
                            <span className="text-gray-800">{prescription.duration}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Instructions */}
                    {prescription.instructions && (
                      <div className="mb-3 pt-3 border-t border-gray-200">
                        <div className="text-sm">
                          <span className="text-gray-600 font-medium">Instructions: </span>
                          <span className="text-gray-800">{prescription.instructions}</span>
                        </div>
                      </div>
                    )}

                    {/* Additional Details */}
                    <div className="mb-3 pt-3 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {prescription.quantity && (
                          <div>
                            <span className="text-gray-600 font-medium">Quantity: </span>
                            <span className="text-gray-800">{prescription.quantity}</span>
                          </div>
                        )}
                        {prescription.refills !== undefined && prescription.refills !== null && (
                          <div>
                            <span className="text-gray-600 font-medium">Refills: </span>
                            <span className="text-gray-800">{prescription.refills} remaining</span>
                          </div>
                        )}
                        {prescription.pharmacy && (
                          <div>
                            <span className="text-gray-600 font-medium">Pharmacy: </span>
                            <span className="text-gray-800">{prescription.pharmacy}</span>
                          </div>
                        )}

                        {/* Dispenser info (show when dispensed) */}
                        {prescription.status === 'dispensed' && (
                          <div>
                            <span className="text-gray-600 font-medium">Dispensed By: </span>
                            <span className="text-gray-800">{prescription.dispenser?.first_name ? `${prescription.dispenser.first_name} ${prescription.dispenser.last_name || ''}` : (prescription.dispenser?.username || 'Pharmacist')}</span>
                            {prescription.date_dispensed && (
                              <div className="text-sm text-gray-500">On: {new Date(prescription.date_dispensed).toLocaleDateString()}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Warnings and Notes */}
                    {prescription.warnings && (
                      <div className="pt-3 border-t border-gray-200">
                        <div className="text-sm">
                          <span className="text-gray-600 font-medium">Warnings: </span>
                          <span className="text-red-600">{prescription.warnings}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  

            })}
          </>
        ) : (
          <div className="card text-center py-12">
            <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'No prescriptions found' : 'No prescriptions available'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterStatus !== 'all'
                ? 'No prescriptions match your current search criteria.'
                : 'You don\'t have any prescriptions yet.'
              }
            </p>
            {(searchTerm || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                }}
                className="btn-primary"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

      {showPrescriptionModal && selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Prescription Details</h2>
                <button onClick={closePrescription} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{selectedPrescription.medication}</h3>
                <div className="text-sm text-gray-600">Dosage: {selectedPrescription.dosage || 'N/A'}</div>
                <div className="text-sm text-gray-600">Frequency: {selectedPrescription.frequency || 'N/A'}</div>
                {selectedPrescription.instructions && <div className="text-sm text-gray-600">Instructions: {selectedPrescription.instructions}</div>}

                {selectedPrescription.status === 'dispensed' && (
                  <div className="pt-3 border-t">
                    <div className="text-sm"><strong>Dispensed by:</strong> {selectedPrescription.dispenser?.first_name ? `${selectedPrescription.dispenser.first_name} ${selectedPrescription.dispenser.last_name || ''}` : (selectedPrescription.dispenser?.username || 'Pharmacist')}</div>
                    {selectedPrescription.date_dispensed && <div className="text-sm text-gray-500">On: {new Date(selectedPrescription.date_dispensed).toLocaleString()}</div>}
                  </div>
                )}

              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button onClick={closePrescription} className="btn-secondary">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}      
      </div>
    </div>
  );
};

export default PatientPrescriptions;