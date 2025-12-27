import React, { useState, useEffect } from 'react'
import { FileText, Edit3, Save, Check, Loader, Search, Filter, Download, Eye } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getCompletedTests, enterTestResult, sendResultToDoctor } from '../../services/labService'
import toast from 'react-hot-toast'

const LabTestResults = () => {
  const { user } = useAuth()
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [editingResult, setEditingResult] = useState(null)
  const [editForm, setEditForm] = useState({
    result: '',
    notes: '',
    status: 'completed'
  })

  useEffect(() => {
    const fetchTestResults = async () => {
      try {
        setIsLoading(true)
        const data = await getCompletedTests()
        setResults(data || [])
      } catch (error) {
        console.error('Error fetching test results:', error)
        toast.error('Failed to load test results')
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchTestResults()
    }
  }, [user])

  // Helper to extract patient name from various response shapes
  const getPatientName = (result) => {
    const patient = result.labRequest?.patient || result.patient || result.patientId || result.patientInfo || null
    if (!patient) return 'Patient Name N/A'

    if (typeof patient === 'string') return patient
    if (patient.username) return patient.username
    if (patient.full_name) return patient.full_name
    if (patient.fullName) return patient.fullName
    if (patient.name) return patient.name
    if (patient.first_name || patient.last_name) return `${patient.first_name || ''} ${patient.last_name || ''}`.trim()
    if (patient.firstName || patient.lastName) return `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
    // Fall back to JSON string if object has an id
    if (patient.id) return patient.id
    return String(patient)
  }

  // Helper to extract doctor name
  const getDoctorName = (result) => {
    const doctor = result.labRequest?.doctor || result.doctor || result.requestedBy || result.requestedById || null
    if (!doctor) return 'Unknown Doctor'

    if (typeof doctor === 'string') return doctor
    if (doctor.username) return doctor.username
    if (doctor.full_name) return doctor.full_name
    if (doctor.fullName) return doctor.fullName
    if (doctor.name) return doctor.name
    if (doctor.first_name || doctor.last_name) return `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim()
    if (doctor.firstName || doctor.lastName) return `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim()
    if (doctor.id) return doctor.id
    return String(doctor)
  }

  const filteredResults = results.filter(result => {
    const matchesSearch = (result.testType || result.test || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (getPatientName(result) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (result.result || result.resultDetails || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (result.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || result.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleEditResult = (result) => {
    setEditingResult(result.id)
    setEditForm({
      result: result.result || '',
      resultDetails: result.resultDetails || result.result || '',
      notes: result.notes || '',
      status: result.status || 'completed'
    })
  }

  const handleSaveResult = async (resultId) => {
    try {
      await enterTestResult(resultId, editForm)
      
      setResults(prevResults => 
        prevResults.map(result => 
          result.id === resultId 
            ? { ...result, ...editForm }
            : result
        )
      )
      
      setEditingResult(null)
      toast.success('Test result updated successfully')
    } catch (error) {
      console.error('Error updating test result:', error)
      toast.error('Failed to update test result')
    }
  }

  const handleCancelEdit = () => {
    setEditingResult(null)
    setEditForm({ result: '', notes: '', status: 'completed' })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'in_progress':
        return 'In Progress'
      case 'pending':
        return 'Pending'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'
    }
  }

  const exportResult = (result) => {
    toast.success('Export functionality would be implemented here')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Test Results</h1>
        <p className="text-gray-600">Review and manage completed test results</p>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search results by test type or patient..."
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
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredResults.length > 0 ? (
          filteredResults.map(result => (
            <div key={result.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {result.labRequest?.testType || result.testType || result.test || 'Test Type N/A'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Patient:</span> {getPatientName(result)}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Requested by Dr:</span> {getDoctorName(result)}
                  </p>
                  
                  {editingResult === result.id ? (
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Result Details
                        </label>
                        <textarea
                          value={editForm.resultDetails || editForm.result}
                          onChange={(e) => setEditForm({...editForm, resultDetails: e.target.value, result: e.target.value})}
                          className="input-field"
                          rows={3}
                          placeholder="Enter detailed test results..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={editForm.notes}
                          onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                          className="input-field"
                          rows={2}
                          placeholder="Additional notes..."
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleSaveResult(result.id)}
                          className="btn-primary text-sm px-3 py-1 flex items-center space-x-1"
                        >
                          <Save className="h-4 w-4" />
                          <span>Save</span>
                        </button>
                        <button 
                          onClick={handleCancelEdit}
                          className="btn-secondary text-sm px-3 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm">
                        <span className="text-gray-600">Result: </span>
                        <span className="font-medium">
                          {result.resultDetails || result.result || 'Result not available'}
                        </span>
                      </p>
                      {result.notes && (
                        <p className="text-sm">
                          <span className="text-gray-600">Notes: </span>
                          <span className="font-medium">{result.notes}</span>
                        </p>
                      )}
                      <div className="text-sm text-gray-500">
                        <span>Completed: </span>
                        <span>
                          {result.completedAt 
                            ? new Date(result.completedAt).toLocaleDateString()
                            : result.date 
                            ? new Date(result.date).toLocaleDateString()
                            : 'Date not available'
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(result.status)}`}>
                    {getStatusText(result.status)}
                  </span>
                  
                  {editingResult !== result.id && (
                    <>
                      <button 
                        onClick={() => exportResult(result)}
                        className="btn-primary text-sm px-3 py-1 flex items-center space-x-1"
                      >
                        <Download className="h-4 w-4" />
                        <span>Export</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Additional test details */}
              {editingResult !== result.id && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Requested by: </span>
                      <span>{getDoctorName(result)}</span>
                    </div>
                    <div>
                      <span className="font-medium">Priority: </span>
                      <span className="capitalize">{result.priority || 'normal'}</span>
                    </div>
                    <div>
                      <span className="font-medium">Technician: </span>
                      <span>{result.technician?.username || result.technician || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'No test results found' : 'No test results available'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== 'all'
                ? 'No results match your current search criteria.'
                : 'No test results have been completed yet.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default LabTestResults

