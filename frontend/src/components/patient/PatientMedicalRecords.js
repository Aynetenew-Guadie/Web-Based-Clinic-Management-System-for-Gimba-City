import React, { useState, useEffect } from 'react';
import { FileText, Calendar, User, Download, Loader, Search, Filter, Eye, Clock, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getMedicalRecords } from '../../services/patientService';
import { toast } from 'react-hot-toast';

const PatientMedicalRecords = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Medical records are fetched from backend via service

  useEffect(() => {
    const fetchMedicalRecords = async () => {
      try {
        setIsLoading(true);
        let data;
        
        try {
          // Try to fetch real data first
          data = await getMedicalRecords();
          setRecords(data || []);
        } catch (error) {
          console.error('Error fetching medical records from backend:', error);
          toast.error('Failed to load medical records from server');
          setRecords([]);
        }
      } catch (error) {
        console.error('Error fetching medical records:', error);
        toast.error('Failed to load medical records from server');
        setRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchMedicalRecords();
    }
  }, [user]);

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.doctor?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.doctor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.chief_complaint?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || record.type === filterType;
    return matchesSearch && matchesType;
  });

  const getRecordTypeColor = (type) => {
    switch (type) {
      case 'general_checkup':
        return 'bg-blue-100 text-blue-800';
      case 'consultation':
        return 'bg-green-100 text-green-800';
      case 'follow_up':
        return 'bg-purple-100 text-purple-800';
      case 'emergency':
        return 'bg-red-100 text-red-800';
      case 'surgery':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecordTypeText = (type) => {
    switch (type) {
      case 'general_checkup':
        return 'General Checkup';
      case 'consultation':
        return 'Consultation';
      case 'follow_up':
        return 'Follow-up Visit';
      case 'emergency':
        return 'Emergency Visit';
      case 'surgery':
        return 'Surgery';
      default:
        return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Medical Record';
    }
  };

  const downloadRecord = (record) => {
    // Create a formatted text file with the medical record details
    const content = `
MEDICAL RECORD
=================================

PATIENT INFORMATION:
-------------------
Name: ${user?.name || user?.username || 'Unknown Patient'}
Record ID: ${record.id}
Date: ${new Date(record.date || record.createdAt).toLocaleDateString()}

VISIT DETAILS:
--------------
Type: ${getRecordTypeText(record.type)}
Doctor: ${record.doctor?.username || record.doctor?.name || record.doctor || 'Unknown Doctor'}
${record.doctor?.employee_id ? `Doctor ID: ${record.doctor.employee_id}\n` : ''}
Date: ${new Date(record.date || record.createdAt).toLocaleDateString()}
${record.duration ? `Duration: ${record.duration}\n` : ''}

MEDICAL INFORMATION:
-------------------
${record.chief_complaint ? `Chief Complaint: ${record.chief_complaint}\n` : ''}
${record.symptoms ? `Symptoms: ${record.symptoms}\n` : ''}
${record.diagnosis ? `Diagnosis: ${record.diagnosis}\n` : ''}
${record.treatment ? `Treatment: ${record.treatment}\n` : ''}
${record.treatment_plan ? `Treatment Plan: ${record.treatment_plan}\n` : ''}

VITAL SIGNS:
------------
${record.blood_pressure_systolic && record.blood_pressure_diastolic ? `Blood Pressure: ${record.blood_pressure_systolic}/${record.blood_pressure_diastolic} mmHg\n` : ''}
${record.temperature_celsius ? `Temperature: ${record.temperature_celsius}°C\n` : ''}
${record.pulse_rate ? `Pulse Rate: ${record.pulse_rate} bpm\n` : ''}
${record.weight_kg ? `Weight: ${record.weight_kg} kg\n` : ''}
${record.height_cm ? `Height: ${record.height_cm} cm\n` : ''}

MEDICATIONS:
------------
${record.medications && record.medications.length > 0 ? record.medications.map(med => `• ${med}`).join('\n') : 'None prescribed'}

CLINICAL NOTES:
---------------
${record.clinical_notes || record.notes || 'No additional notes'}

${record.summary ? `\nSUMMARY:\n${record.summary}\n` : ''}

FOLLOW-UP:
----------
${record.follow_up_date ? `Follow-up Date: ${new Date(record.follow_up_date).toLocaleDateString()}\n` : 'No follow-up scheduled'}

ATTACHMENTS:
------------
${record.attachments && record.attachments.length > 0 ? record.attachments.join(', ') : 'No attachments'}

=================================
Generated on: ${new Date().toLocaleString()}
This is a computer-generated report. Please consult with your healthcare provider for official medical records.
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medical-record-${record.id}-${new Date(record.date || record.createdAt).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('Medical record downloaded successfully');
  };

  const viewDetails = (record) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setSelectedRecord(null);
    setShowDetailModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your medical records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
          <p className="text-gray-600">View your complete medical history</p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredRecords.length} of {records.length} records
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search records by type, doctor, diagnosis, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input-field min-w-[150px]"
              >
                <option value="all">All Types</option>
                <option value="general_checkup">General Checkup</option>
                <option value="consultation">Consultation</option>
                <option value="follow_up">Follow-up Visit</option>
                <option value="emergency">Emergency Visit</option>
                <option value="surgery">Surgery</option>
              </select>
            </div>
            {(searchTerm || filterType !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                }}
                className="btn-secondary text-sm px-3 py-2"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Demo notice removed - medical records load from backend */}

      <div className="space-y-4">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((record) => (
            <div key={record.id} className="card hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {getRecordTypeText(record.type)}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRecordTypeColor(record.type)} flex-shrink-0`}>
                          {getRecordTypeText(record.type)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{record.doctor?.username || record.doctor?.name || record.doctor || 'Unknown Doctor'}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(record.date || record.createdAt).toLocaleDateString()}</span>
                        </span>
                        {record.duration && (
                          <>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{record.duration}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        {record.chief_complaint && (
                          <div className="text-sm">
                            <span className="text-gray-600 font-medium">Chief Complaint: </span>
                            <span className="text-gray-800">{record.chief_complaint}</span>
                          </div>
                        )}
                        {record.diagnosis && (
                          <div className="text-sm">
                            <span className="text-gray-600 font-medium">Diagnosis: </span>
                            <span className="text-gray-800 font-medium">{record.diagnosis}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {record.treatment && (
                          <div className="text-sm">
                            <span className="text-gray-600 font-medium">Treatment: </span>
                            <span className="text-gray-800">{record.treatment}</span>
                          </div>
                        )}
                        {record.medications && record.medications.length > 0 && (
                          <div className="text-sm">
                            <span className="text-gray-600 font-medium">Medications: </span>
                            <span className="text-gray-800">{record.medications.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {record.summary && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-gray-700 text-sm">
                          <span className="font-medium">Summary: </span>
                          {record.summary}
                        </p>
                      </div>
                    )}
                    
                    {record.notes && (
                      <div className="pt-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Notes: </span>
                          {record.notes}
                        </p>
                      </div>
                    )}

                    {/* Attachments */}
                    {record.attachments && record.attachments.length > 0 && (
                      <div className="pt-3 border-t border-gray-200">
                        <div className="text-sm">
                          <span className="text-gray-600 font-medium">Attachments: </span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {record.attachments.map((attachment, index) => (
                              <div key={index} className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-md">
                                <FileText className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-700">{attachment}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Follow-up Information */}
                    {record.follow_up_date && (
                      <div className="pt-3 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Follow-up Date: </span>
                          {new Date(record.follow_up_date).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2 ml-4 flex-shrink-0">
                  <button 
                    onClick={() => viewDetails(record)}
                    className="btn-secondary text-sm px-3 py-2 flex items-center space-x-1 whitespace-nowrap"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Details</span>
                  </button>
                  <button 
                    onClick={() => downloadRecord(record)}
                    className="btn-primary text-sm px-3 py-2 flex items-center space-x-1 whitespace-nowrap"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterType !== 'all' ? 'No medical records found' : 'No medical records available'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterType !== 'all'
                ? 'No medical records match your current search criteria.'
                : 'You don\'t have any medical records yet.'
              }
            </p>
            {(searchTerm || filterType !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                }}
                className="btn-primary"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Medical Record Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Medical Record Details
                </h2>
                <button 
                  onClick={closeDetailModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Record Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-600 font-medium">Record Type: </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRecordTypeColor(selectedRecord.type)}`}>
                          {getRecordTypeText(selectedRecord.type)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Date: </span>
                        <span className="text-gray-800">{new Date(selectedRecord.date || selectedRecord.createdAt).toLocaleDateString()}</span>
                      </div>
                      {selectedRecord.appointment_time && (
                        <div>
                          <span className="text-gray-600 font-medium">Time: </span>
                          <span className="text-gray-800">{new Date(selectedRecord.appointment_time).toLocaleTimeString()}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600 font-medium">Doctor: </span>
                        <span className="text-gray-800">{selectedRecord.doctor?.username || selectedRecord.doctor?.name || selectedRecord.doctor || 'Unknown Doctor'}</span>
                      </div>
                      {selectedRecord.doctor?.employee_id && (
                        <div>
                          <span className="text-gray-600 font-medium">Doctor ID: </span>
                          <span className="text-gray-800 font-mono">{selectedRecord.doctor.employee_id}</span>
                        </div>
                      )}
                      {selectedRecord.duration && (
                        <div>
                          <span className="text-gray-600 font-medium">Duration: </span>
                          <span className="text-gray-800">{selectedRecord.duration}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Vital Signs</h3>
                    <div className="space-y-2">
                      {selectedRecord.blood_pressure_systolic && selectedRecord.blood_pressure_diastolic && (
                        <div>
                          <span className="text-gray-600 font-medium">Blood Pressure: </span>
                          <span className="text-gray-800">{selectedRecord.blood_pressure_systolic}/{selectedRecord.blood_pressure_diastolic} mmHg</span>
                        </div>
                      )}
                      {selectedRecord.temperature_celsius && (
                        <div>
                          <span className="text-gray-600 font-medium">Temperature: </span>
                          <span className="text-gray-800">{selectedRecord.temperature_celsius}°C</span>
                        </div>
                      )}
                      {selectedRecord.pulse_rate && (
                        <div>
                          <span className="text-gray-600 font-medium">Pulse Rate: </span>
                          <span className="text-gray-800">{selectedRecord.pulse_rate} bpm</span>
                        </div>
                      )}
                      {selectedRecord.weight_kg && (
                        <div>
                          <span className="text-gray-600 font-medium">Weight: </span>
                          <span className="text-gray-800">{selectedRecord.weight_kg} kg</span>
                        </div>
                      )}
                      {selectedRecord.height_cm && (
                        <div>
                          <span className="text-gray-600 font-medium">Height: </span>
                          <span className="text-gray-800">{selectedRecord.height_cm} cm</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedRecord.chief_complaint && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Chief Complaint</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedRecord.chief_complaint}</p>
                  </div>
                )}
                
                {selectedRecord.symptoms && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Symptoms</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedRecord.symptoms}</p>
                  </div>
                )}
                
                {selectedRecord.diagnosis && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Diagnosis</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedRecord.diagnosis}</p>
                  </div>
                )}
                
                {selectedRecord.treatment_plan && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Treatment Plan</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedRecord.treatment_plan}</p>
                  </div>
                )}
                
                {selectedRecord.clinical_notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Clinical Notes</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedRecord.clinical_notes}</p>
                  </div>
                )}
                
                {selectedRecord.medications && selectedRecord.medications.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Medications</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <ul className="list-disc list-inside space-y-1">
                        {selectedRecord.medications.map((medication, index) => (
                          <li key={index} className="text-gray-700">{medication}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {selectedRecord.follow_up_date && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Follow-up Information</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="text-gray-600 font-medium">Follow-up Date: </span>
                      <span className="text-gray-800">{new Date(selectedRecord.follow_up_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
                
                {selectedRecord.attachments && selectedRecord.attachments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Attachments</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex flex-wrap gap-2">
                        {selectedRecord.attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center space-x-2 px-3 py-1 bg-white rounded-md border">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{attachment}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button 
                  onClick={() => downloadRecord(selectedRecord)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Record</span>
                </button>
                <button 
                  onClick={closeDetailModal}
                  className="btn-secondary"
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

export default PatientMedicalRecords;