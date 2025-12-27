import React, { useState, useEffect } from 'react';
import { FlaskConical, Calendar, Download, FileText, Loader, Search, Filter, User, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getLabResults } from '../../services/patientService';
import { toast } from 'react-hot-toast';
import { getDoctorName, getTechnicianName } from '../../utils/nameHelpers';

const PatientLabResults = () => {
  const { user } = useAuth();
  const [labResults, setLabResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // No inline mock data — lab results fetched from backend via service

  useEffect(() => {
    const fetchLabResults = async () => {
      try {
        setIsLoading(true);
        const data = await getLabResults();
        setLabResults(data || []);
      } catch (error) {
        console.error('Error fetching lab results:', error);
        toast.error('Failed to load lab results from backend');
        setLabResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchLabResults();
    }
  }, [user]);

  const filteredResults = labResults.filter(result => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (result.labRequest?.testType || result.testType || result.test || '').toLowerCase().includes(term) ||
                         getDoctorName(result).toLowerCase().includes(term) ||
                         getTechnicianName(result).toLowerCase().includes(term) ||
                         (result.notes || '').toLowerCase().includes(term);
    const matchesStatus = filterStatus === 'all' || result.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'released':
        return 'bg-green-100 text-green-800';
      case 'shared':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'released':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusText = (result) => {
    if (result.statusText) {
      return result.statusText;
    }
    
    switch (result.status) {
      case 'released':
        return 'Released with Diagnosis';
      case 'shared':
        return 'Shared by Doctor';
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      default:
        return result.status?.charAt(0).toUpperCase() + result.status?.slice(1) || 'Unknown';
    }
  };

  // Using shared helpers from utils/nameHelpers for doctor/technician names

  const downloadReport = (result) => {
    // Create a formatted text file with the lab result details
    const content = `
LABORATORY TEST REPORT
=================================

PATIENT INFORMATION:
-------------------
Name: ${user?.name || user?.username || 'Unknown Patient'}
Test ID: ${result.id}
Test Date: ${new Date(result.date || result.createdAt).toLocaleDateString()}
Report Date: ${new Date().toLocaleDateString()}

TEST INFORMATION:
-----------------
Test Type: ${result.labRequest?.testType || result.testType || result.test || 'Laboratory Test'}
Ordering Physician: ${getDoctorName(result)}
${result.doctor?.employee_id ? `Physician ID: ${result.doctor.employee_id}\n` : ''}
Status: ${getStatusText(result)}
${result.urgency ? `Priority: ${result.urgency}\n` : ''}

LABORATORY DETAILS:
-------------------
${getTechnicianName(result) ? `Lab Technician: ${getTechnicianName(result)}\n` : ''}
${result.availableDate ? `Available Date: ${new Date(result.availableDate).toLocaleDateString()}\n` : ''}

TEST RESULTS:
-------------
${result.resultDetails || 'No detailed results available'}

${result.labReference ? `\nREFERENCE RANGES:\n${result.labReference}\n` : ''}

${result.abnormalFlags && result.abnormalFlags.length > 0 ? `
ABNORMAL FINDINGS:
------------------
${result.abnormalFlags.map(flag => `• ${flag}`).join('\n')}
` : ''}

${result.criticalValues ? `
*** CRITICAL VALUES IDENTIFIED ***
Please contact your healthcare provider immediately.
` : ''}

CLINICAL NOTES:
---------------
${result.notes || 'No additional notes'}

ATTACHMENTS:
------------
${result.attachments && result.attachments.length > 0 ? result.attachments.join(', ') : 'No attachments available'}

=================================
This is a computer-generated laboratory report.
For official medical records, please contact the laboratory or your healthcare provider.
Generated on: ${new Date().toLocaleString()}
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lab-result-${result.id}-${new Date(result.date || result.createdAt).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('Lab report downloaded successfully');
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'stat':
        return 'bg-red-100 text-red-800';
      case 'urgent':
        return 'bg-orange-100 text-orange-800';
      case 'routine':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your lab results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lab Results</h1>
          <p className="text-gray-600">View your laboratory test results</p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredResults.length} of {labResults.length} results
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search results by test type, doctor, or notes..."
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
                <option value="all">All Results</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
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

      {/* Demo notice removed - lab results load from backend */}

      <div className="space-y-4">
        {filteredResults.length > 0 ? (
          filteredResults.map((result) => (
            <div key={result.id} className="card hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FlaskConical className="h-6 w-6 text-purple-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {result.labRequest?.testType || result.testType || result.test || 'Laboratory Test'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${getStatusColor(result.status)}`}>
                          {getStatusIcon(result.status)}
                          <span>{getStatusText(result)}</span>
                        </span>
                        {result.urgency && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(result.urgency)}`}>
                            {result.urgency.toUpperCase()}
                          </span>
                        )}
                        {result.abnormalFlags && result.abnormalFlags.length > 0 && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 flex items-center space-x-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>Abnormal Results</span>
                          </span>
                        )}
                        {result.criticalValues && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center space-x-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>Critical Values</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <User className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {getDoctorName(result)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>
                          Test Date: {new Date(result.date || result.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {result.availableDate && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>
                            Available: {new Date(result.availableDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {result.estimatedCompletion && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span>
                            Estimated: {new Date(result.estimatedCompletion).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {getTechnicianName(result) && getTechnicianName(result) !== 'Unknown' && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Technician: </span>
                          <span>{getTechnicianName(result)}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {result.resultDetails && (
                        <div className="text-sm">
                          <span className="text-gray-600 font-medium">Results: </span>
                          <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono whitespace-pre-wrap">
                            {result.resultDetails}
                          </div>
                        </div>
                      )}
                      {result.notes && (
                        <div className="text-sm">
                          <span className="text-gray-600 font-medium">Notes: </span>
                          <span className="text-gray-800">{result.notes}</span>
                        </div>
                      )}
                      {result.labReference && (
                        <div className="text-sm">
                          <span className="text-gray-600 font-medium">Reference: </span>
                          <span className="text-gray-800 text-xs">{result.labReference}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Abnormal Flags */}
                  {result.abnormalFlags && result.abnormalFlags.length > 0 && (
                    <div className="mb-3 pt-3 border-t border-gray-200">
                      <div className="text-sm">
                        <span className="text-gray-600 font-medium">Abnormal Findings: </span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {result.abnormalFlags.map((flag, index) => (
                            <span key={index} className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {result.attachments && result.attachments.length > 0 && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="text-sm">
                        <span className="text-gray-600 font-medium">Attachments: </span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {result.attachments.map((attachment, index) => (
                            <div key={index} className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-md">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-700">{attachment}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col space-y-2 flex-shrink-0">
                  {(result.status === 'completed' || result.status === 'released') && (
                    <button 
                      onClick={() => downloadReport(result)}
                      className="btn-primary text-sm px-3 py-2 flex items-center space-x-1 whitespace-nowrap"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                  )}
                  {result.criticalValues && (
                    <button 
                      onClick={() => toast.error('Critical values detected! Contact your healthcare provider immediately.')}
                      className="btn-secondary text-sm px-3 py-2 flex items-center space-x-1 whitespace-nowrap bg-red-600 text-white hover:bg-red-700"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>Critical Alert</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <FlaskConical className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'No lab results found' : 'No lab results available'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterStatus !== 'all'
                ? 'No lab results match your current search criteria.'
                : 'You don\'t have any lab results yet.'
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
      </div>
    </div>
  );
};

export default PatientLabResults;