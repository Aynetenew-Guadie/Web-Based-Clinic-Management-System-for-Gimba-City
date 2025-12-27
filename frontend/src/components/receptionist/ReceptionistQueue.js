import React, { useState, useEffect, useMemo } from 'react'
import { Users, User, Clock, Loader, Search, CheckCircle, AlertCircle, Phone, UserCheck, UserX, Plus, Bell, Calendar, MapPin, X, Mail, Heart, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getPatientQueue, getPatients, getAvailableDoctors } from '../../services/receptionistService'
import toast from 'react-hot-toast'

const ReceptionistQueue = () => {
  const { user } = useAuth()
  const [queue, setQueue] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [processingPatients, setProcessingPatients] = useState(new Set())
  const [showAddToQueue, setShowAddToQueue] = useState(false)
  const [newQueueEntry, setNewQueueEntry] = useState({
    patientId: '',
    doctorId: '',
    appointmentType: 'walk-in',
    priority: 'normal',
    notes: ''
  })
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [queueStats, setQueueStats] = useState({
    total: 0,
    waiting: 0,
    inProgress: 0,
    completed: 0,
    avgWaitTime: 0
  })
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Use Promise.allSettled to handle API failures gracefully
        const [queueData, patientsData, doctorsData] = await Promise.allSettled([
          getPatientQueue(),
          getPatients(),
          getAvailableDoctors()
        ])

        // Safely extract data from responses
        const queue = queueData.status === 'fulfilled' 
          ? (queueData.value?.data || queueData.value || []) 
          : []
        
        const patients = patientsData.status === 'fulfilled' 
          ? (patientsData.value?.data || patientsData.value || []) 
          : []
        
        const doctors = doctorsData.status === 'fulfilled' 
          ? (doctorsData.value?.data || doctorsData.value || []) 
          : []

        console.log('Fetched data:', { queue: queue.length, patients: patients.length, doctors: doctors.length })

        setQueue(queue)
        setPatients(patients)
        setDoctors(doctors)

        // Calculate queue statistics
        const stats = calculateQueueStats(queue)
        setQueueStats(stats)

      } catch (error) {
        console.error('Error fetching queue data:', error)
        toast.error('Failed to load queue data')
        setQueue([])
        setPatients([])
        setDoctors([])
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchData()
      // Set up real-time updates
      const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [user])

  const calculateQueueStats = (queueData) => {
    const stats = {
      total: queueData.length,
      waiting: 0,
      inProgress: 0,
      completed: 0,
      avgWaitTime: 0
    }

    queueData.forEach(q => {
      if (q.status === 'waiting' || q.status === 'checked_in') stats.waiting++
      else if (q.status === 'in-consultation' || q.status === 'in_progress') stats.inProgress++
      else if (q.status === 'completed') stats.completed++
    })

    stats.avgWaitTime = calculateAverageWaitTime(queueData)
    return stats
  }

  const calculateAverageWaitTime = (queueData) => {
    const waitingPatients = queueData.filter(q => 
      (q.status === 'waiting' || q.status === 'checked_in') && 
      (q.check_in_time || q.arrived_at || q.created_at)
    )
    
    if (waitingPatients.length === 0) return 0

    const totalWaitTime = waitingPatients.reduce((acc, patient) => {
      const checkInTime = new Date(patient.check_in_time || patient.arrived_at || patient.created_at)
      const waitTime = new Date() - checkInTime
      return acc + waitTime
    }, 0)

    return Math.round(totalWaitTime / waitingPatients.length / (1000 * 60)) // Convert to minutes
  }

  const filteredQueue = useMemo(() => {
    const searchLower = (searchTerm || '').toLowerCase()

    return queue.filter(item => {
      // Safely coerce fields to strings before lowercasing to avoid calling
      // methods on undefined and causing runtime errors.
      const patientUsername = (item.patient?.username || '').toLowerCase()
      const patientFirst = (item.patient?.first_name || '').toLowerCase()
      const patientLast = (item.patient?.last_name || '').toLowerCase()
      const doctorUsername = (item.doctor?.username || '').toLowerCase()
      const doctorFirst = (item.doctor?.first_name || '').toLowerCase()
      const doctorLast = (item.doctor?.last_name || '').toLowerCase()

      const matchesSearch = searchLower === '' || 
        patientUsername.includes(searchLower) ||
        patientFirst.includes(searchLower) ||
        patientLast.includes(searchLower) ||
        doctorUsername.includes(searchLower) ||
        doctorFirst.includes(searchLower) ||
        doctorLast.includes(searchLower)

      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'waiting' && (item.status === 'waiting' || item.status === 'checked_in')) ||
        (filterStatus === 'in_consultation' && (item.status === 'in-consultation' || item.status === 'in_progress')) ||
        (filterStatus === 'completed' && item.status === 'completed') ||
        item.status === filterStatus

      return matchesSearch && matchesStatus
    })
  }, [queue, searchTerm, filterStatus])

  const handleAddToQueue = async (e) => {
    e.preventDefault()
    if (!newQueueEntry.patientId) {
      toast.error('Please select a patient')
      return
    }

    try {
      const selectedPatient = patients.find(p => p.id === parseInt(newQueueEntry.patientId))
      const selectedDoctor = doctors.find(d => d.id === parseInt(newQueueEntry.doctorId))

      if (!selectedPatient) {
        toast.error('Selected patient not found')
        return
      }

      const queueEntry = {
        id: Date.now(),
        patient_id: selectedPatient.id,
        doctor_id: newQueueEntry.doctorId || null,
        patient: selectedPatient,
        doctor: selectedDoctor,
        status: 'waiting',
        priority: newQueueEntry.priority,
        appointment_type: newQueueEntry.appointmentType,
        notes: newQueueEntry.notes,
        check_in_time: new Date().toISOString(),
        arrived_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        queue_number: queue.length + 1
      }

      setQueue(prev => [...prev, queueEntry])
      toast.success('Patient added to queue successfully')
      
      // Reset form
      setNewQueueEntry({
        patientId: '',
        doctorId: '',
        appointmentType: 'walk-in',
        priority: 'normal',
        notes: ''
      })
      setPatientSearch('')
      setShowAddToQueue(false)
      
      // Update stats
      setQueueStats(prev => calculateQueueStats([...queue, queueEntry]))
      
    } catch (error) {
      console.error('Error adding patient to queue:', error)
      toast.error('Failed to add patient to queue')
    }
  }

  const handleStatusUpdate = async (queueId, newStatus) => {
    if (processingPatients.has(queueId)) return

    setProcessingPatients(prev => new Set([...prev, queueId]))
    
    try {
      // Update local state immediately
      setQueue(prev => prev.map(item => 
        item.id === queueId 
          ? { 
              ...item, 
              status: newStatus, 
              updated_at: new Date().toISOString(),
              // If completing, set completion time
              ...(newStatus === 'completed' && { completed_at: new Date().toISOString() })
            }
          : item
      ))

      const statusMessages = {
        'in-consultation': 'Patient called for consultation',
        'in_progress': 'Patient consultation started',
        'completed': 'Patient consultation completed',
        'cancelled': 'Patient appointment cancelled'
      }
      
      toast.success(statusMessages[newStatus] || 'Status updated successfully')
      
      // Update stats after state change
      setTimeout(() => {
        setQueueStats(prev => calculateQueueStats(queue.map(item => 
          item.id === queueId ? { ...item, status: newStatus } : item
        )))
      }, 100)
      
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update patient status')
    } finally {
      setProcessingPatients(prev => {
        const newSet = new Set(prev)
        newSet.delete(queueId)
        return newSet
      })
    }
  }

  const callNextPatient = async () => {
    const nextPatient = queue.find(q => 
      q.status === 'waiting' || q.status === 'checked_in'
    )
    
    if (!nextPatient) {
      toast.info('No patients waiting in queue')
      return
    }

    await handleStatusUpdate(nextPatient.id, 'in-consultation')
    
    // Show notification for calling next patient
    toast.success(`Calling ${getPatientName(nextPatient.patient)} to consultation room`, {
      duration: 5000,
      icon: '📢'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting':
      case 'checked_in':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'in-consultation':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'waiting':
      case 'checked_in':
        return 'Waiting'
      case 'in-consultation':
      case 'in_progress':
        return 'In Consultation'
      case 'completed':
        return 'Completed'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status?.replace('_', ' ').charAt(0).toUpperCase() + 
               status?.replace('_', ' ').slice(1) || 'Unknown'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'waiting':
      case 'checked_in':
        return <Clock className="h-4 w-4" />
      case 'in-consultation':
      case 'in_progress':
        return <AlertCircle className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getPatientName = (patient) => {
    if (!patient) return 'Unknown Patient'
    if (patient.first_name && patient.last_name) {
      return `${patient.first_name} ${patient.last_name}`
    }
    return patient.username || 'Unknown Patient'
  }

  const getDoctorName = (doctor) => {
    if (!doctor) return 'Doctor TBD'
    if (doctor.first_name && doctor.last_name) {
      return `Dr. ${doctor.first_name} ${doctor.last_name}`
    }
    return doctor.username ? `Dr. ${doctor.username}` : 'Doctor TBD'
  }

  const getWaitTime = (item) => {
    const time = item.arrived_at || item.check_in_time || item.created_at
    if (!time) return 'N/A'
    
    try {
      const arrivalTime = new Date(time)
      const now = new Date()
      const diffMs = now - arrivalTime
      const diffMins = Math.floor(diffMs / 60000)
      
      if (diffMins < 1) {
        return 'Just arrived'
      } else if (diffMins < 60) {
        return `${diffMins} min`
      } else {
        const hours = Math.floor(diffMins / 60)
        const mins = diffMins % 60
        return `${hours}h ${mins}m`
      }
    } catch (error) {
      return 'N/A'
    }
  }

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A'
    try {
      return new Date(timeString).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } catch (error) {
      return timeString
    }
  }

  const { waitingCount, inConsultationCount } = useMemo(() => ({
    waitingCount: queueStats.waiting,
    inConsultationCount: queueStats.inProgress
  }), [queueStats])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-600">Loading queue data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Queue</h1>
          <p className="text-gray-600">Manage and monitor patient flow</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={callNextPatient}
            disabled={waitingCount === 0}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50"
          >
            <Bell className="h-4 w-4" />
            <span>Call Next Patient</span>
          </button>
          <button
            onClick={() => setShowAddToQueue(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add to Queue</span>
          </button>
        </div>
      </div>

      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Total in Queue</p>
              <p className="text-2xl font-bold text-blue-800">{queueStats.total}</p>
              <p className="text-xs text-blue-600 mt-1">
                Avg wait: {queueStats.avgWaitTime}min
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600">Waiting</p>
              <p className="text-2xl font-bold text-yellow-800">{waitingCount}</p>
              <p className="text-xs text-yellow-600 mt-1">
                Ready to be called
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">In Consultation</p>
              <p className="text-2xl font-bold text-green-800">{inConsultationCount}</p>
              <p className="text-xs text-green-600 mt-1">
                With doctors
              </p>
            </div>
            <User className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients by name or doctor..."
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
            <option value="waiting">Waiting</option>
            <option value="in_consultation">In Consultation</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-4">
        {filteredQueue.length > 0 ? (
          filteredQueue.map(item => (
            <div 
              key={item.id} 
              className={`card transition-all duration-200 hover:shadow-md ${
                item.status === 'in-consultation' || item.status === 'in_progress'
                  ? 'border-primary-300 bg-primary-50'
                  : item.status === 'waiting' || item.status === 'checked_in'
                  ? 'border-yellow-300 bg-yellow-50'
                  : ''
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getPatientName(item.patient)}
                    </h3>
                    <div className="text-sm text-gray-600 space-y-2 mt-2">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Arrived: {formatTime(item.arrived_at || item.check_in_time)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm text-gray-500">
                            Wait: {getWaitTime(item)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{getDoctorName(item.doctor)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {item.appointment_type || item.visit_type || 'General Consultation'}
                          </span>
                        </div>
                      </div>
                      
                      {item.notes && (
                        <div className="text-sm text-gray-500">
                          <span className="font-medium">Notes: </span>
                          {item.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-0 lg:space-y-2">
                  <span className={`px-3 py-2 text-sm font-medium rounded-full flex items-center space-x-2 ${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                    <span>{getStatusText(item.status)}</span>
                  </span>
                  
                  <div className="flex space-x-2">
                    {(item.status === 'waiting' || item.status === 'checked_in') && (
                      <button 
                        onClick={() => handleStatusUpdate(item.id, 'in-consultation')}
                        disabled={processingPatients.has(item.id)}
                        className="btn-primary text-sm px-3 py-2 disabled:opacity-50 flex items-center space-x-1"
                      >
                        {processingPatients.has(item.id) ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Phone className="h-4 w-4" />
                        )}
                        <span>Call</span>
                      </button>
                    )}
                    
                    {(item.status === 'in-consultation' || item.status === 'in_progress') && (
                      <button 
                        onClick={() => handleStatusUpdate(item.id, 'completed')}
                        disabled={processingPatients.has(item.id)}
                        className="btn-success text-sm px-3 py-2 disabled:opacity-50 flex items-center space-x-1"
                      >
                        {processingPatients.has(item.id) ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        <span>Complete</span>
                      </button>
                    )}
                    
                    <button 
                      onClick={() => setSelectedPatient(item.patient)}
                      className="btn-secondary text-sm px-3 py-2 flex items-center space-x-1"
                    >
                      <User className="h-4 w-4" />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'No patients found' : 'No patients in queue'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== 'all'
                ? 'No patients match your current search criteria.'
                : 'The patient queue is currently empty.'
              }
            </p>
            {queue.length === 0 && (
              <button 
                onClick={() => setShowAddToQueue(true)}
                className="btn-primary mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Patient
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add to Queue Modal */}
      {showAddToQueue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Add Patient to Queue</h2>
                <button 
                  onClick={() => setShowAddToQueue(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddToQueue} className="space-y-4">
                {/* Patient Selection */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient *
                  </label>
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value)
                      setShowPatientDropdown(true)
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    className="input-field"
                    placeholder="Search patients..."
                    required
                  />
                  {showPatientDropdown && patients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {patients
                        .filter(patient => {
                          const searchLower = (patientSearch || '').toLowerCase()
                          const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase()
                          const username = (patient.username || '').toLowerCase()
                          const patientId = patient.id.toString()
                          return fullName.includes(searchLower) || 
                                 username.includes(searchLower) || 
                                 patientId.includes(searchLower)
                        })
                        .slice(0, 10)
                        .map(patient => (
                          <div
                            key={patient.id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                            onClick={() => {
                              setNewQueueEntry(prev => ({ ...prev, patientId: patient.id }))
                              setPatientSearch(
                                patient.first_name && patient.last_name 
                                  ? `${patient.first_name} ${patient.last_name}`
                                  : patient.username
                              )
                              setShowPatientDropdown(false)
                            }}
                          >
                            <div className="font-medium">
                              {patient.first_name && patient.last_name 
                                ? `${patient.first_name} ${patient.last_name}`
                                : patient.username
                              }
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {patient.id} {patient.phone && `• ${patient.phone}`}
                            </div>
                          </div>
                        ))
                      }
                      {patients.filter(patient => {
                        const searchLower = (patientSearch || '').toLowerCase()
                        const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase()
                        const username = (patient.username || '').toLowerCase()
                        const patientId = patient.id.toString()
                        return fullName.includes(searchLower) || 
                               username.includes(searchLower) || 
                               patientId.includes(searchLower)
                      }).length === 0 && (
                        <div className="px-3 py-2 text-gray-500 text-center">
                          No patients found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Doctor Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Doctor (Optional)
                  </label>
                  <select
                    value={newQueueEntry.doctorId}
                    onChange={(e) => setNewQueueEntry(prev => ({ ...prev, doctorId: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Select a doctor</option>
                    {doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.first_name && doctor.last_name 
                          ? `Dr. ${doctor.first_name} ${doctor.last_name}`
                          : `Dr. ${doctor.username}`
                        }
                      </option>
                    ))}
                  </select>
                </div>

                {/* Appointment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Appointment Type
                  </label>
                  <select
                    value={newQueueEntry.appointmentType}
                    onChange={(e) => setNewQueueEntry(prev => ({ ...prev, appointmentType: e.target.value }))}
                    className="input-field"
                  >
                    <option value="walk-in">Walk-in</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newQueueEntry.priority}
                    onChange={(e) => setNewQueueEntry(prev => ({ ...prev, priority: e.target.value }))}
                    className="input-field"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={newQueueEntry.notes}
                    onChange={(e) => setNewQueueEntry(prev => ({ ...prev, notes: e.target.value }))}
                    className="input-field"
                    rows="3"
                    placeholder="Any special notes..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddToQueue(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Add to Queue
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Patient Details</h2>
                <button 
                  onClick={() => setSelectedPatient(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Full Name</label>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedPatient.first_name && selectedPatient.last_name 
                          ? `${selectedPatient.first_name} ${selectedPatient.last_name}`
                          : selectedPatient.username || 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Patient ID</label>
                      <p className="text-gray-900">{selectedPatient.patient_id || `PAT${String(selectedPatient.id).padStart(6, '0')}`}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <p className="text-gray-900">{selectedPatient.email || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Phone</label>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <p className="text-gray-900">{selectedPatient.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                      <p className="text-gray-900">
                        {selectedPatient.date_of_birth 
                          ? new Date(selectedPatient.date_of_birth).toLocaleDateString()
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Gender</label>
                      <p className="text-gray-900 capitalize">{selectedPatient.gender || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Blood Type</label>
                      <div className="flex items-center space-x-2">
                        <Heart className="h-4 w-4 text-red-400" />
                        <p className="text-gray-900">{selectedPatient.blood_type || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Registration Date</label>
                      <p className="text-gray-900">
                        {selectedPatient.created_at || selectedPatient.createdAt
                          ? new Date(selectedPatient.created_at || selectedPatient.createdAt).toLocaleDateString()
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                {selectedPatient.address && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <div className="flex items-start space-x-2 mt-1">
                      <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                      <div className="text-gray-900">
                        <p>{selectedPatient.address}</p>
                        {(selectedPatient.city || selectedPatient.state || selectedPatient.postal_code) && (
                          <p className="text-sm text-gray-600">
                            {[selectedPatient.city, selectedPatient.state, selectedPatient.postal_code]
                              .filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Emergency Contact */}
                {selectedPatient.emergency_contact_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Emergency Contact</label>
                    <div className="mt-1 p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-red-600" />
                        <p className="font-medium text-red-900">{selectedPatient.emergency_contact_name}</p>
                      </div>
                      {selectedPatient.emergency_contact_phone && (
                        <p className="text-sm text-red-700 ml-6">{selectedPatient.emergency_contact_phone}</p>
                      )}
                      {selectedPatient.emergency_contact_relationship && (
                        <p className="text-sm text-red-600 ml-6">
                          Relationship: {selectedPatient.emergency_contact_relationship}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Medical Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedPatient.allergies && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Allergies</label>
                      <div className="mt-1 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-yellow-900">{selectedPatient.allergies}</p>
                      </div>
                    </div>
                  )}

                  {selectedPatient.medical_history && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Medical History</label>
                      <div className="mt-1 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-blue-900">{selectedPatient.medical_history}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Insurance Information */}
                {selectedPatient.insurance_provider && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Insurance Information</label>
                    <div className="mt-1 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="font-medium text-green-900">{selectedPatient.insurance_provider}</p>
                      {selectedPatient.insurance_policy_number && (
                        <p className="text-sm text-green-700">Policy: {selectedPatient.insurance_policy_number}</p>
                      )}
                      {selectedPatient.insurance_group_number && (
                        <p className="text-sm text-green-700">Group: {selectedPatient.insurance_group_number}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setSelectedPatient(null)}
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
  )
}

export default ReceptionistQueue