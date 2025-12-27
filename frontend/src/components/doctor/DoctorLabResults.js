import React, { useState, useEffect } from 'react';
import { FileText, Eye, Download, Search, Filter, Calendar, User, FlaskConical, Send, X, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getLabResults, releaseLabResultToPatient, shareLabResultToPatient } from '../../services/doctorService';
import toast from 'react-hot-toast';
import { getPatientName, getTechnicianName } from '../../utils/nameHelpers';

const DoctorLabResults = () => {
  const { user } = useAuth();
  const [labResults, setLabResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  // No inline mock data — lab results fetched from backend

  const fetchLabResults = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching lab results for user:', user?.id);
      const data = await getLabResults();
      console.log('Lab results received:', data);
      setLabResults(data || []);
    } catch (error) {
      console.error('Error fetching lab results:', error);
      // Backend not available — set empty list and notify
      setLabResults([]);
      toast.error('Failed to load lab results from backend');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLabResults();
    }
  }, [user]);

  // Helpers to extract patient/technician names from varying backend shapes
  const getPatientName = (result) => {
    const patient = result.labRequest?.patient || result.patient || result.patientId || result.patientInfo || null;
    if (!patient) return 'Unknown';
    if (typeof patient === 'string') return patient;
    if (patient.name) return patient.name;
    if (patient.username) return patient.username;
    if (patient.full_name) return patient.full_name;
    if (patient.first_name || patient.last_name) return `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
    if (patient.id) return String(patient.id);
    return String(patient);
  };

  const getTechnicianName = (result) => {
    const tech = result.technician || result.technicianId || result.labRequest?.technician || null;
    if (!tech) return 'Unknown';
    if (typeof tech === 'string') return tech;
    if (typeof tech === 'number') return String(tech);
    if (tech.name) return tech.name;
    if (tech.username) return tech.username;
    if (tech.first_name || tech.last_name) return `${tech.first_name || ''} ${tech.last_name || ''}`.trim();
    if (tech.id) return String(tech.id);
    return String(tech);
  };

  const filteredResults = labResults.filter(result => {
    const testType = result.labRequest?.testType || '';
    const patientName = (getPatientName(result) || '').toString();
    const resultDetails = result.resultDetails || '';
    
    const matchesSearch = 
      testType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resultDetails.toLowerCase().includes(searchTerm.toLowerCase());
    
    const resultStatus = result.status || 'pending_review';
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'released' && result.releasedToPatient) ||
                         (filterStatus === 'shared' && result.sharedWithPatient) ||
                         (filterStatus === 'pending_review' && !result.releasedToPatient && !result.sharedWithPatient);
    
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (result) => {
    setSelectedResult(result);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedResult(null);
  };

  const exportResult = (result) => {
    // Create a simple text file with the lab result data
    const content = `
Lab Result Report
=================

Test Type: ${result.labRequest?.testType || 'N/A'}
Patient: ${getPatientName(result)}
Date: ${result.date ? new Date(result.date).toLocaleDateString() : 'N/A'}
Technician: ${getTechnicianName(result)}
Status: ${result.status || 'pending_review'}

Results:
${result.resultDetails || 'No results available'}

${result.notes ? `Notes: ${result.notes}` : ''}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lab-result-${result.id}-${result.labRequest?.testType?.replace(/\s+/g, '-').toLowerCase() || 'test'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Lab result exported successfully');
  };

  const handleReleaseToPatient = (result) => {
    setSelectedResult(result);
    setShowReleaseModal(true);
    setDiagnosisNotes('');
  };

  const handleReleaseSubmit = async (e) => {
    e.preventDefault();
    
    if (!diagnosisNotes.trim()) {
      toast.error('Please provide diagnosis notes before releasing the result');
      return;
    }

    setIsReleasing(true);
    try {
      await releaseLabResultToPatient(selectedResult.id, diagnosisNotes);
      setLabResults(prev => prev.map(result => 
        result.id === selectedResult.id 
          ? { 
              ...result, 
              releasedToPatient: true, 
              releasedAt: new Date().toISOString(),
              status: 'released'
            }
          : result
      ));
      setShowReleaseModal(false);
      setSelectedResult(null);
      setDiagnosisNotes('');
      toast.success('Lab result successfully released to patient');
    } catch (error) {
      console.error('Error releasing lab result:', error);
      toast.error('Failed to release lab result');
      setShowReleaseModal(false);
      setSelectedResult(null);
      setDiagnosisNotes('');
    } finally {
      setIsReleasing(false);
    }
  };

  const closeReleaseModal = () => {
    setShowReleaseModal(false);
    setSelectedResult(null);
    setDiagnosisNotes('');
  };

  const handleShareToPatient = async (result) => {
    try {
      setIsSharing(true);
      await shareLabResultToPatient(result.id);
      setLabResults(prev => prev.map(r => 
        r.id === result.id 
          ? { 
              ...r, 
              sharedWithPatient: true, 
              sharedAt: new Date().toISOString(),
              status: 'shared'
            }
          : r
      ));
      toast.success('Lab result shared with patient successfully');
    } catch (error) {
      console.error('Error sharing lab result:', error);
      toast.error('Failed to share lab result');
    } finally {
      setIsSharing(false);
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

  const getStatusColor = (result) => {
    if (result.releasedToPatient) return 'bg-green-100 text-green-800';
    if (result.sharedWithPatient) return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusText = (result) => {
    if (result.releasedToPatient) return 'Released';
    if (result.sharedWithPatient) return 'Shared';
    return 'Pending Review';
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lab Results</h1>
        <p className="text-gray-600">View completed laboratory test results</p>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by test type, patient, or results..."
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
            <option value="all">All Results</option>
            <option value="released">Released to Patient</option>
            <option value="shared">Shared with Patient</option>
            <option value="pending_review">Pending Review</option>
          </select>
        </div>
      </div>

      {/* Lab Results List */}
      <div className="space-y-4">
        {filteredResults.length > 0 ? (
          filteredResults.map(result => (
            <div key={result.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FlaskConical className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {result.labRequest?.testType || 'Test Type N/A'}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(result)}`}>
                        {getStatusText(result)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>Patient: {getPatientName(result)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Completed: {formatDate(result.date)}
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-500">
                        <span className="font-medium">Technician:</span> {getTechnicianName(result)}
                      </div>
                    </div>
                    
                    {/* Result Preview */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">Results:</span>
                        <p className="mt-1 text-gray-600 line-clamp-2">
                          {result.resultDetails || 'No results available'}
                        </p>
                      </div>
                      {result.notes && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium text-gray-700">Notes:</span>
                          <p className="mt-1 text-gray-600 line-clamp-1">
                            {result.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button 
                    onClick={() => handleViewDetails(result)}
                    className="btn-secondary text-sm px-3 py-1 flex items-center space-x-1"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Details</span>
                  </button>
                  
                  {/* Simple Share Button */}
                  {!result.sharedWithPatient && !result.releasedToPatient && (
                    <button 
                      onClick={() => handleShareToPatient(result)}
                      disabled={isSharing}
                      className="btn-secondary text-sm px-3 py-1 flex items-center space-x-1 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      {isSharing ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      <span>{isSharing ? 'Sharing...' : 'Share to Patient'}</span>
                    </button>
                  )}
                  
                  {/* Full Release Button */}
                  {!result.releasedToPatient && (
                    <button 
                      onClick={() => handleReleaseToPatient(result)}
                      className="btn-primary text-sm px-3 py-1 flex items-center space-x-1"
                    >
                      <Send className="h-4 w-4" />
                      <span>Release to Patient</span>
                    </button>
                  )}
                  
                  {/* Status Indicators */}
                  <div className="flex flex-col space-y-1">
                    {result.sharedWithPatient && (
                      <div className="text-xs text-blue-600 font-medium">
                        Shared with Patient
                      </div>
                    )}
                    {result.releasedToPatient && (
                      <div className="text-xs text-green-600 font-medium">
                        Released to Patient
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => exportResult(result)}
                    className="btn-secondary text-sm px-3 py-1 flex items-center space-x-1"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'No lab results found' : 'No lab results available'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== 'all'
                ? 'No results match your current search criteria.'
                : 'No completed lab results are available yet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Lab Result Details Modal */}
      {showDetailsModal && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Lab Result Details
                </h3>
                <p className="text-gray-600 mt-1">
                  {selectedResult.labRequest?.testType} - {getPatientName(selectedResult)}
                </p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Test Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Test Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Test Type:</strong> {selectedResult.labRequest?.testType || 'N/A'}</div>
                      <div><strong>Patient:</strong> {getPatientName(selectedResult)}</div>
                      <div><strong>Urgency:</strong> {selectedResult.labRequest?.urgency || 'N/A'}</div>
                      <div><strong>Status:</strong> {getStatusText(selectedResult)}</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Timeline</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Requested:</strong> {formatDate(selectedResult.labRequest?.createdAt)}</div>
                      <div><strong>Completed:</strong> {formatDate(selectedResult.date)}</div>
                      <div><strong>Technician:</strong> {getTechnicianName(selectedResult)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Results */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Test Results</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                    {selectedResult.resultDetails || 'No results available'}
                  </pre>
                </div>
              </div>

              {/* Additional Notes */}
              {selectedResult.notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Additional Notes</h4>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">{selectedResult.notes}</p>
                  </div>
                </div>
              )}

              {/* Report URL */}
              {selectedResult.reportUrl && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Additional Reports</h4>
                  <a 
                    href={selectedResult.reportUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700"
                  >
                    <FileText className="h-4 w-4" />
                    <span>View Report</span>
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-8">
              <button onClick={handleCloseModal} className="btn-secondary">
                Close
              </button>
              <button 
                onClick={() => exportResult(selectedResult)}
                className="btn-primary flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export Result</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Release to Patient Modal */}
      {showReleaseModal && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Release Lab Result to Patient
              </h3>
              <button 
                onClick={closeReleaseModal}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <p><strong>Test:</strong> {selectedResult.labRequest?.testType || 'N/A'}</p>
                <p><strong>Patient:</strong> {getPatientName(selectedResult)}</p>
                <p><strong>Date:</strong> {formatDate(selectedResult.date)}</p>
              </div>
            </div>

            <form onSubmit={handleReleaseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diagnosis Notes *
                </label>
                <textarea
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  className="input-field"
                  rows={4}
                  placeholder="Enter your diagnosis based on the lab results..."
                  required
                  disabled={isReleasing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This diagnosis will be recorded in the patient's medical record and the lab result will be released to them.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeReleaseModal}
                  className="btn-secondary"
                  disabled={isReleasing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                  disabled={isReleasing}
                >
                  {isReleasing ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>{isReleasing ? 'Releasing...' : 'Release to Patient'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorLabResults;