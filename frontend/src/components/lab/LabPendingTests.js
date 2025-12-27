import React, { useState, useEffect } from 'react'
import { FlaskConical, User, Play, Check, Loader, Search, Filter, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { getPendingTests, acceptTestRequest, enterTestResult } from '../../services/labService'
import toast from 'react-hot-toast'

const LabPendingTests = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tests, setTests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPriority, setFilterPriority] = useState('all')
  const [processingTests, setProcessingTests] = useState(new Set())
  const [showResultModal, setShowResultModal] = useState(false)
  const [selectedTest, setSelectedTest] = useState(null)
  const [resultForm, setResultForm] = useState({
    resultDetails: '',
    notes: '',
    reportUrl: ''
  })

  useEffect(() => {
    const fetchPendingTests = async () => {
      try {
        setIsLoading(true)
        const data = await getPendingTests()
        setTests(data || [])
      } catch (error) {
        console.error('Error fetching pending tests:', error)
        toast.error('Failed to load pending tests')
        setTests([])
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchPendingTests()
    }
  }, [user])

  // Helpers to extract patient/doctor names from different API shapes
  const getPatientName = (test) => {
    const patient = test.labRequest?.patient || test.patient || test.patientId || test.patientInfo || null
    if (!patient) return 'Patient Name N/A'
    if (typeof patient === 'string') return patient
    if (patient.username) return patient.username
    if (patient.full_name) return patient.full_name
    if (patient.fullName) return patient.fullName
    if (patient.name) return patient.name
    if (patient.first_name || patient.last_name) return `${patient.first_name || ''} ${patient.last_name || ''}`.trim()
    if (patient.firstName || patient.lastName) return `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
    if (patient.id) return patient.id
    return String(patient)
  }

  const getDoctorName = (test) => {
    const doctor = test.labRequest?.doctor || test.doctor || test.requestedBy || test.requestedById || null
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

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.testType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (getPatientName(test) || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPriority = filterPriority === 'all' || test.priority === filterPriority
    const isPending = test.status === 'pending'
    return matchesSearch && matchesPriority && isPending
  })

  const handleStartTest = async (testId) => {
    if (processingTests.has(testId)) return

    try {
      setProcessingTests(prev => new Set(prev).add(testId))
      
      await acceptTestRequest(testId, user.id)
      
      setTests(prevTests => prevTests.filter(test => test.id !== testId))
      
      toast.success('Test started successfully! Redirecting to In-Progress Tests...')
      
      setTimeout(() => {
        navigate('/lab/in-progress-tests')
      }, 1500)
    } catch (error) {
      console.error('Error starting test:', error)
      toast.error('Failed to start test')
    } finally {
      setProcessingTests(prev => {
        const newSet = new Set(prev)
        newSet.delete(testId)
        return newSet
      })
    }
  }

  const handleCompleteTest = (test) => {
    setSelectedTest(test)
    setShowResultModal(true)
    setResultForm({
      resultDetails: '',
      notes: '',
      reportUrl: ''
    })
  }

  const handleSubmitResult = async () => {
    if (!selectedTest || !resultForm.resultDetails.trim()) {
      toast.error('Please enter test results')
      return
    }

    try {
      await enterTestResult(selectedTest.id, {
        labRequestId: selectedTest.id,
        resultDetails: resultForm.resultDetails,
        notes: resultForm.notes,
        reportUrl: resultForm.reportUrl
      })

      setTests(prevTests => prevTests.filter(test => test.id !== selectedTest.id))
      
      setShowResultModal(false)
      setSelectedTest(null)
      toast.success('Test completed and results sent to doctor')
    } catch (error) {
      console.error('Error completing test:', error)
      toast.error('Failed to complete test')
    }
  }

  const handleCancelResult = () => {
    setShowResultModal(false)
    setSelectedTest(null)
    setResultForm({
      resultDetails: '',
      notes: '',
      reportUrl: ''
    })
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'normal':
        return 'bg-blue-100 text-blue-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high':
        return 'High'
      case 'normal':
        return 'Normal'
      case 'low':
        return 'Low'
      default:
        return priority?.charAt(0).toUpperCase() + priority?.slice(1) || 'Normal'
    }
  }

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'emergency':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'urgent':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      default:
        return null
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Pending Tests</h1>
        <p className="text-gray-600">Start processing laboratory tests</p>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tests by type or patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="input-field"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="normal">Normal Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTests.length > 0 ? (
          filteredTests.map(test => (
            <div key={test.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FlaskConical className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {test.testType || test.test || 'Test Type N/A'}
                      </h3>
                      {getUrgencyIcon(test.urgency)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {getPatientName(test)}
                    </p>
                    {test.notes && (
                      <p className="text-xs text-gray-500 mt-1">{test.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(test.priority)}`}>
                    {getPriorityText(test.priority)}
                  </span>
                  <button 
                    onClick={() => handleStartTest(test.id)} 
                    disabled={processingTests.has(test.id)}
                    className="btn-primary text-sm px-3 py-1 flex items-center space-x-1 disabled:opacity-50"
                  >
                    {processingTests.has(test.id) ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span>{processingTests.has(test.id) ? 'Starting...' : 'Start'}</span>
                  </button>
                </div>
              </div>
              
              {/* Additional test details */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Requested by: </span>
                    <span>{getDoctorName(test)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Date: </span>
                    <span>
                      {test.createdAt 
                        ? new Date(test.createdAt).toLocaleDateString()
                        : test.date 
                        ? new Date(test.date).toLocaleDateString()
                        : 'Date not available'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Urgency: </span>
                    <span className="capitalize">{test.urgency || 'routine'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <FlaskConical className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterPriority !== 'all' ? 'No pending tests found' : 'No pending tests available'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterPriority !== 'all'
                ? 'No tests match your current search criteria.'
                : 'All tests have been processed or there are no pending requests.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Test Result Entry Modal */}
      {showResultModal && selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Complete Test: {selectedTest.testType}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Results *
                </label>
                <textarea
                  value={resultForm.resultDetails}
                  onChange={(e) => setResultForm({...resultForm, resultDetails: e.target.value})}
                  className="input-field"
                  rows={4}
                  placeholder="Enter detailed test results..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={resultForm.notes}
                  onChange={(e) => setResultForm({...resultForm, notes: e.target.value})}
                  className="input-field"
                  rows={2}
                  placeholder="Any additional observations or notes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report URL (Optional)
                </label>
                <input
                  type="url"
                  value={resultForm.reportUrl}
                  onChange={(e) => setResultForm({...resultForm, reportUrl: e.target.value})}
                  className="input-field"
                  placeholder="Link to detailed report or images..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={handleCancelResult} className="btn-secondary">
                Cancel
              </button>
              <button 
                onClick={handleSubmitResult}
                disabled={!resultForm.resultDetails.trim()}
                className="btn-primary disabled:opacity-50"
              >
                Submit Results & Complete Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LabPendingTests
