import React, { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, User, MapPin, Plus, Filter, Loader, Search, Edit, X, RefreshCw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { 
  scheduleAppointment, 
  getAppointmentRequests, 
  getScheduledAppointments, 
  getPatients, 
  getAvailableDoctors, 
  processAppointmentRequest 
} from '../../services/receptionistService'
import toast from 'react-hot-toast'
import { getPatientName, getDoctorName } from '../../utils/nameHelpers'

const ReceptionistAppointments = () => {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAppointment, setNewAppointment] = useState({
    patientId: '',
    doctorId: '',
    appointmentDate: '',
    startTime: '',
    endTime: '',
    visitType: '',
    roomNumber: '',
    notes: '',
    reason: ''
  })
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [patientSearch, setPatientSearch] = useState('')
  const [doctorSearch, setDoctorSearch] = useState('')
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)
  const patientDropdownRef = useRef(null)
  const doctorDropdownRef = useRef(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [approvalDetails, setApprovalDetails] = useState({
    doctorId: '',
    date: '',
    startTime: '',
    endTime: '',
    roomNumber: '',
    notes: '',
    doctorName: ''
  })
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [rescheduleDetails, setRescheduleDetails] = useState({
    appointmentDate: '',
    startTime: '',
    endTime: '',
    doctorId: '',
    roomNumber: '',
    notes: ''
  })

  // Precompute filtered dropdown options to simplify JSX and avoid complex inline ternaries
  const filteredPatientOptions = Array.isArray(patients)
    ? patients.filter(patient => {
        const searchLower = (patientSearch || '').toLowerCase()
        const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase()
        const username = (patient.username || '').toLowerCase()
        const email = (patient.email || '').toLowerCase()
        const phone = (patient.phone || '').toLowerCase()
        const patientId = (patient.patientId || patient.id || patient.employee_id || '').toString()
        return fullName.includes(searchLower) || username.includes(searchLower) || email.includes(searchLower) || phone.includes(searchLower) || patientId.includes(searchLower)
      }).slice(0, 20)
    : []

  const filteredDoctorOptions = Array.isArray(doctors)
    ? doctors.filter(doctor => {
        const searchLower = (doctorSearch || '').toLowerCase()
        // Support multiple possible name keys coming from different endpoints
        const fullName = `${doctor.first_name || doctor.firstName || doctor.name || ''} ${doctor.last_name || doctor.lastName || ''}`.toLowerCase()
        const username = (doctor.username || '').toLowerCase()
        const specialization = (doctor.specialization || '').toLowerCase()
        const employeeId = (doctor.employee_id || '').toLowerCase()
        const doctorId = (doctor.employee_id || doctor.id || '').toString()
        return (
          fullName.includes(searchLower) ||
          username.includes(searchLower) ||
          specialization.includes(searchLower) ||
          employeeId.includes(searchLower) ||
          doctorId.includes(searchLower)
        )
      }).slice(0, 20)
    : []

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
      
        // Use Promise.allSettled to handle potential failures gracefully
        const [scheduledAppts, appointmentRequests, patientsData, doctorsData] = await Promise.allSettled([
          getScheduledAppointments(),
          getAppointmentRequests(),
          getPatients(),
          getAvailableDoctors()
        ])

        // Handle responses safely
        const scheduledData = scheduledAppts.status === 'fulfilled' ? 
          (scheduledAppts.value?.data || scheduledAppts.value || []) : []
        
        const requestsData = appointmentRequests.status === 'fulfilled' ? 
          (appointmentRequests.value?.data || appointmentRequests.value || []) : []
        
        const patients = patientsData.status === 'fulfilled' ? 
          (patientsData.value?.data || patientsData.value?.patients || patientsData.value || []) : []
        
        const doctors = doctorsData.status === 'fulfilled' ? 
          (doctorsData.value?.data || doctorsData.value?.doctors || doctorsData.value || []) : []
       
        // Combine appointments and requests
        const allAppointments = [
          ...scheduledData.map(apt => ({ ...apt, type: 'scheduled' })),
          ...requestsData.map(req => ({ ...req, type: 'request' }))
        ]

        console.log('ReceptionistAppointments fetched counts:', {
          appointments: allAppointments.length,
          patientsType: Array.isArray(patients) ? 'array' : typeof patients,
          patientsLength: Array.isArray(patients) ? patients.length : undefined,
          doctorsType: Array.isArray(doctors) ? 'array' : typeof doctors,
          doctorsLength: Array.isArray(doctors) ? doctors.length : undefined
        })

        // Normalize appointments to a consistent shape (backend returns multiple shapes)
        const normalizeAppointment = (a) => {
          const appointment_date = a.appointment_date || a.appointmentDate || a.date || a.preferred_date || a.preferredDate || null
          const start_time_raw = a.start_time || a.startTime || a.time || a.preferred_time || a.preferredTime || null
          const end_time_raw = a.end_time || a.endTime || null

          const normalized = {
            ...a,
            appointment_date,
            start_time: start_time_raw,
            end_time: end_time_raw,
            visit_type: a.visit_type || a.visitType || a.type || a.visit || '',
            room_number: a.room_number || a.roomNumber || a.room || '',
            reason: a.reason || a.notes || a.reason || a.note || '',
            // Keep doctor info consistent
            doctor: a.doctor || (a.doctorName ? { id: a.doctorId || a.doctor_id, name: a.doctorName } : null)
          }

          return normalized
        }

        const normalizedAppointments = allAppointments.map(normalizeAppointment)

        setAppointments(normalizedAppointments)
        setPatients(patients)

        // Normalize doctors - some endpoints may return { success: true, data: [...] }
        const normalizedDoctors = Array.isArray(doctors)
          ? doctors
          : (doctors?.data || doctors?.doctors || [])

        console.log('Normalized doctors:', {
          length: normalizedDoctors.length,
          sample: normalizedDoctors.slice(0, 5)
        })

        setDoctors(normalizedDoctors)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data')
        setAppointments([])
        setPatients([])
        setDoctors([])
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user])

  // Debug: log filtered options on search or doctors change
  useEffect(() => {
    try {
      console.log('Doctor search:', doctorSearch, 'Doctors length:', doctors.length)
      console.log('Filtered doctor options (first 10):', filteredDoctorOptions.slice(0, 10))
    } catch (e) {
      console.log('Filtering debug error:', e)
    }
  }, [doctorSearch, doctors])

  const filteredAppointments = appointments.filter(apt => {
    const matchesFilter = filter === 'all' || 
                         apt.status === filter || 
                         apt.type === filter ||
                         (filter === 'request' && apt.type === 'request')
    
    const matchesSearch = searchTerm === '' || 
      (apt.patient?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       apt.doctor?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       getPatientName(apt).toLowerCase().includes(searchTerm.toLowerCase()) ||
       apt.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       apt.doctor?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       apt.doctor?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesFilter && matchesSearch
  })

  const handleAddAppointment = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!newAppointment.patientId || !newAppointment.doctorId || !newAppointment.appointmentDate || !newAppointment.startTime) {
      toast.error('Please fill in all required fields: Patient, Doctor, Date, and Start Time')
      return
    }

    if (!newAppointment.visitType) {
      toast.error('Please select a visit type')
      return
    }

    try {
      console.log('📅 Scheduling new appointment:', newAppointment)
      
      const appointmentData = {
        patientId: newAppointment.patientId,
        doctorId: newAppointment.doctorId,
        appointmentDate: newAppointment.appointmentDate,
        startTime: newAppointment.startTime,
        endTime: newAppointment.endTime || '', // Can be empty for auto-calculation
        visitType: newAppointment.visitType,
        roomNumber: newAppointment.roomNumber || '',
        notes: newAppointment.notes || '',
        reason: newAppointment.reason || 'General Consultation'
      }

      const result = await scheduleAppointment(appointmentData)
      
      // Add the new appointment to the list
      const newAppt = {
        ...result,
        type: 'scheduled',
        status: 'scheduled'
      }
      
      setAppointments(prev => [newAppt, ...prev])
      
      // Reset form
      setNewAppointment({
        patientId: '',
        doctorId: '',
        appointmentDate: '',
        startTime: '',
        endTime: '',
        visitType: '',
        roomNumber: '',
        notes: '',
        reason: ''
      })
      setPatientSearch('')
      setDoctorSearch('')
      setShowAddForm(false)
      toast.success('Appointment scheduled successfully')
    } catch (error) {
      console.error('Error scheduling appointment:', error)
      toast.error(error.message || 'Failed to schedule appointment')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
      case 'no_show':
        return 'bg-red-100 text-red-800'
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-purple-100 text-purple-800'
      case 'pending':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled'
      case 'confirmed':
        return 'Confirmed'
      case 'completed':
        return 'Completed'
      case 'cancelled':
        return 'Cancelled'
      case 'no_show':
        return 'No Show'
      case 'waiting':
        return 'Waiting'
      case 'in_progress':
        return 'In Progress'
      case 'pending':
        return 'Pending'
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'
    }
  }

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A'
    try {
      // If already in 12-hour with AM/PM, return as-is
      if (/\b(AM|PM)\b/i.test(timeString)) return timeString.trim()

      const [hours, minutes] = timeString.split(':')
      const hour = parseInt(hours)
      if (isNaN(hour)) return timeString
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      return `${displayHour}:${(minutes || '00').trim()} ${ampm}`
    } catch (error) {
      return timeString
    }
  }

  const handleApproveRequest = (request) => {
    setSelectedRequest(request)
    
    // Set default approval details
    const defaultStartTime = request.preferred_time_slot === 'morning' ? '09:00' : 
                            request.preferred_time_slot === 'afternoon' ? '14:00' : '18:00'
    
    const defaultEndTime = request.preferred_time_slot === 'morning' ? '09:30' : 
                          request.preferred_time_slot === 'afternoon' ? '14:30' : '18:30'

    setApprovalDetails({
      doctorId: request.preferred_doctor_id || (doctors[0]?.id || ''),
      date: request.preferred_date || new Date().toISOString().split('T')[0],
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      roomNumber: '',
      notes: request.notes || '',
      doctorName: (getDoctorName(request) || '').replace(/^Dr\.?\s*/i, ''),
    })
    setShowApprovalModal(true)
  }

  const handleModifyRequest = (requestId) => {
    toast('Modify request feature coming soon')
  }

  const handleRejectRequest = async (requestId, reason = 'Schedule conflict') => {
    try {
      if (!window.confirm('Are you sure you want to reject this appointment request?')) {
        return
      }

      await processAppointmentRequest(requestId, 'reject', { reason })
      
      // Remove the rejected request from the list
      setAppointments(prev => prev.filter(apt => 
        !(apt.id === requestId && apt.type === 'request')
      ))
      
      toast.success('Appointment request rejected')
    } catch (error) {
      console.error('Error rejecting request:', error)
      toast.error(error.message || 'Failed to reject request')
    }
  }

  const confirmApproval = async () => {
    try {
      if (!approvalDetails.date || !approvalDetails.startTime) {
        toast.error('Please fill in date and start time')
        return
      }

      let doctorId = approvalDetails.doctorId
      // Convert to number if it's a string
      if (doctorId && typeof doctorId === 'string') {
        doctorId = parseInt(doctorId, 10)
        if (isNaN(doctorId)) {
          toast.error('Please enter a valid doctor ID')
          return
        }
      }

      const appointmentDetails = {
        doctorId: doctorId,
        date: approvalDetails.date,
        startTime: approvalDetails.startTime,
        endTime: approvalDetails.endTime,
        roomNumber: approvalDetails.roomNumber,
        notes: approvalDetails.notes,
        visitType: selectedRequest.visit_type || 'consultation',
        reason: selectedRequest.reason || 'Appointment request'
      }

      console.log('Approving request with details:', appointmentDetails)

      await processAppointmentRequest(selectedRequest.id, 'approve', appointmentDetails)
      
      // Remove the approved request and add it as a scheduled appointment
      setAppointments(prev => {
        const filtered = prev.filter(apt => apt.id !== selectedRequest.id)
        const newAppointment = {
          ...selectedRequest,
          type: 'scheduled',
          status: 'scheduled',
          appointment_date: approvalDetails.date,
          start_time: approvalDetails.startTime,
          end_time: approvalDetails.endTime,
          room_number: approvalDetails.roomNumber,
          doctor_id: doctorId
        }
        return [newAppointment, ...filtered]
      })

      setShowApprovalModal(false)
      setSelectedRequest(null)
      toast.success('Appointment request approved and scheduled')
    } catch (error) {
      console.error('Error approving request:', error)
      toast.error(error.message || 'Failed to approve request')
    }
  }

  const handleRescheduleAppointment = (appointment) => {
    setSelectedAppointment(appointment)
    setRescheduleDetails({
      appointmentDate: appointment.appointment_date || '',
      startTime: appointment.start_time || '',
      endTime: appointment.end_time || '',
      doctorId: appointment.doctor_id || '',
      roomNumber: appointment.room_number || '',
      notes: appointment.notes || ''
    })
    setShowRescheduleModal(true)
  }

  const confirmReschedule = async () => {
    try {
      if (!rescheduleDetails.appointmentDate || !rescheduleDetails.startTime) {
        toast.error('Please fill in date and start time')
        return
      }

      // Update local state immediately (optimistic update)
      setAppointments(prev => prev.map(apt => 
        apt.id === selectedAppointment.id 
          ? { 
              ...apt, 
              appointment_date: rescheduleDetails.appointmentDate,
              start_time: rescheduleDetails.startTime,
              end_time: rescheduleDetails.endTime,
              doctor_id: rescheduleDetails.doctorId || apt.doctor_id,
              room_number: rescheduleDetails.roomNumber,
              notes: rescheduleDetails.notes
            }
          : apt
      ))

      setShowRescheduleModal(false)
      setSelectedAppointment(null)
      toast.success('Appointment rescheduled successfully')
    } catch (error) {
      console.error('Error rescheduling appointment:', error)
      toast.error('Failed to reschedule appointment')
    }
  }

  const handleCancelAppointment = async (appointmentId) => {
    try {
      if (!window.confirm('Are you sure you want to cancel this appointment?')) {
        return
      }

      setAppointments(prev => prev.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, status: 'cancelled' }
          : apt
      ))
      toast.success('Appointment cancelled')
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      toast.error('Failed to cancel appointment')
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      // If click is inside patient or doctor dropdown wrappers, do nothing
      if (patientDropdownRef.current && patientDropdownRef.current.contains(e.target)) return
      if (doctorDropdownRef.current && doctorDropdownRef.current.contains(e.target)) return

      setShowPatientDropdown(false)
      setShowDoctorDropdown(false)
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  // Helper: fetch doctors from backend and normalize response
  const fetchDoctors = async () => {
    try {
      const resp = await getAvailableDoctors()
      const fetched = Array.isArray(resp) ? resp : (resp?.data || resp?.doctors || resp || [])
      console.log('Fetched available doctors:', { length: (fetched || []).length, sample: (fetched || []).slice(0,5) })
      setDoctors(Array.isArray(fetched) ? fetched : [])
      return fetched
    } catch (e) {
      console.error('Error fetching doctors:', e)
      toast.error('Failed to fetch doctors')
      return []
    }
  }

  // If user opens the add form and doctors are empty, fetch available doctors on demand
  useEffect(() => {
    const loadDoctorsOnOpen = async () => {
      if (!showAddForm) return
      if (Array.isArray(doctors) && doctors.length > 0) return
      await fetchDoctors()
    }

    loadDoctorsOnOpen()
  }, [showAddForm])

  // Poll for new doctors while Add form is open (helps capture newly registered doctors)
  useEffect(() => {
    if (!showAddForm) return
    const id = setInterval(() => {
      fetchDoctors()
    }, 15000) // every 15 seconds

    return () => clearInterval(id)
  }, [showAddForm])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600">Schedule and manage appointments</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>{showAddForm ? 'Cancel' : 'New Appointment'}</span>
        </button>
      </div>

      {/* Add Appointment Form */}
      {showAddForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule New Appointment</h3>
          <form onSubmit={handleAddAppointment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Patient Search */}
              <div className="relative" ref={patientDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient <span className="text-red-500">*</span>
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
                  placeholder="Search patients by name or ID..."
                  required
                />
                {showPatientDropdown && (Array.isArray(patients) && patients.length > 0) && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredPatientOptions.map(patient => (
                        <div
                          key={patient.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            setNewAppointment(prev => ({...prev, patientId: patient.id}))
                            setPatientSearch(`${getPatientName(patient)} (ID: ${patient.id})`)
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
                            ID: {patient.id} {patient.employee_id && `• ${patient.employee_id}`}
                          </div>
                        </div>
                      ))
                    }
                    {filteredPatientOptions.length === 0 && (
                      <div className="px-3 py-2 text-gray-500 text-center">
                        No patients found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Doctor Search */}
              <div className="relative" ref={doctorDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doctor <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={doctorSearch}
                    onChange={(e) => {
                      setDoctorSearch(e.target.value)
                      setShowDoctorDropdown(true)
                    }}
                    onFocus={() => setShowDoctorDropdown(true)}
                    className="input-field flex-1"
                    placeholder="Search doctors by name or ID..."
                    required
                  />
                  <button
                    type="button"
                    title="Refresh doctors"
                    onClick={async (e) => { e.stopPropagation(); await fetchDoctors(); setShowDoctorDropdown(true) }}
                    className="btn-ghost p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                {showDoctorDropdown && (Array.isArray(doctors) && doctors.length > 0) && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredDoctorOptions.map(doctor => (
                        <div
                          key={doctor.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            setNewAppointment(prev => ({...prev, doctorId: doctor.id}))
                            setDoctorSearch((() => { const dn = getDoctorName(doctor); return /^Dr/i.test(dn) ? `${dn} (ID: ${doctor.id})` : `Dr. ${dn} (ID: ${doctor.id})` })())
                            setShowDoctorDropdown(false)
                          }}
                        >
                          <div className="font-medium">
                            {(() => { const dn = getDoctorName(doctor); return /^Dr/i.test(dn) ? dn : `Dr. ${dn}` })()}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {doctor.id} {doctor.specialization && `• ${doctor.specialization}`}
                          </div>
                        </div>
                      ))
                    }
                    {filteredDoctorOptions.length === 0 && (
                      <div className="px-3 py-2 text-gray-500 text-center">
                        No doctors found
                      </div>
                    )}
                  </div>
                )}

                {/* Debug info: show available doctors (first 10) and count */}
                {showAddForm && (
                  <div className="mt-1 text-xs text-gray-500">
                    Doctors count: {doctors.length} — sample: {doctors.slice(0, 10).map(d => (d?.name || d?.first_name || d?.username || `#${d?.id}`)).join(', ') || 'none'}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newAppointment.appointmentDate}
                  onChange={(e) => setNewAppointment(prev => ({...prev, appointmentDate: e.target.value}))}
                  className="input-field"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={newAppointment.startTime}
                  onChange={(e) => setNewAppointment(prev => ({...prev, startTime: e.target.value}))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={newAppointment.endTime}
                  onChange={(e) => setNewAppointment(prev => ({...prev, endTime: e.target.value}))}
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visit Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={newAppointment.visitType}
                  onChange={(e) => setNewAppointment(prev => ({...prev, visitType: e.target.value}))}
                  className="input-field"
                  required
                >
                  <option value="">Select visit type</option>
                  <option value="consultation">Consultation</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="emergency">Emergency</option>
                  <option value="routine_checkup">Routine Checkup</option>
                  <option value="procedure">Procedure</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Number
                </label>
                <input
                  type="text"
                  value={newAppointment.roomNumber}
                  onChange={(e) => setNewAppointment(prev => ({...prev, roomNumber: e.target.value}))}
                  className="input-field"
                  placeholder="e.g., 101, 202A"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason/Notes
              </label>
              <textarea
                value={newAppointment.notes}
                onChange={(e) => setNewAppointment(prev => ({...prev, notes: e.target.value}))}
                className="input-field"
                rows="3"
                placeholder="Reason for visit or additional notes..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setNewAppointment({
                    patientId: '',
                    doctorId: '',
                    appointmentDate: '',
                    startTime: '',
                    endTime: '',
                    visitType: '',
                    roomNumber: '',
                    notes: '',
                    reason: ''
                  })
                  setPatientSearch('')
                  setDoctorSearch('')
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Schedule Appointment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search appointments by patient or doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
            <Filter className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 flex-shrink-0">Filter:</span>
            {['all', 'scheduled', 'request', 'confirmed', 'waiting', 'in_progress', 'completed', 'cancelled'].map(status => (
              <button 
                key={status} 
                onClick={() => setFilter(status)} 
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 flex-shrink-0 ${
                  filter === status 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : 
                 status === 'in_progress' ? 'In Progress' :
                 status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map(apt => (
            <div key={`${apt.type}-${apt.id}`} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <User className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getPatientName(apt)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {(() => { const dn = getDoctorName(apt); return /^Dr/i.test(dn) ? dn : `Dr. ${dn}` })()}
                      </p>
                      {apt.type === 'request' && (
                        <span className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full mt-1">
                          Appointment Request
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {apt.appointment_date 
                            ? new Date(apt.appointment_date).toLocaleDateString()
                            : apt.preferred_date
                            ? new Date(apt.preferred_date).toLocaleDateString()
                            : 'Date not set'
                          }
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {apt.start_time 
                            ? `${formatTime(apt.start_time)} - ${formatTime(apt.end_time)}`
                            : apt.preferred_time || 'Time not set'
                          }
                        </span>
                      </div>
                      {apt.room_number && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>Room {apt.room_number}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(apt.status)}`}>
                        {getStatusText(apt.status)}
                      </span>
                      {apt.visit_type && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Type: </span>
                          {apt.visit_type.replace('_', ' ')}
                        </p>
                      )}
                      {apt.reason && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Reason: </span>
                          {apt.reason}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {apt.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Notes: </span>
                        {apt.notes}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col space-y-2 ml-4">
                  {apt.type === 'request' ? (
                    <>
                      <button 
                        onClick={() => handleApproveRequest(apt)}
                        className="btn-primary text-sm px-3 py-1"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleModifyRequest(apt.id)}
                        className="btn-secondary text-sm px-3 py-1"
                      >
                        Modify
                      </button>
                      <button 
                        onClick={() => handleRejectRequest(apt.id)}
                        className="btn-danger text-sm px-3 py-1"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleRescheduleAppointment(apt)}
                        className="btn-secondary text-sm px-3 py-1 flex items-center"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Reschedule
                      </button>
                      {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                        <button 
                          onClick={() => handleCancelAppointment(apt.id)}
                          className="btn-danger text-sm px-3 py-1 flex items-center"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filter !== 'all' ? 'No appointments found' : 'No appointments available'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filter !== 'all'
                ? 'No appointments match your current search criteria.'
                : 'Start by scheduling your first appointment.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Approve Appointment Request
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Patient: {getPatientName(selectedRequest)}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doctor ID <span className="text-red-500">*</span>
                </label>
                <select
                  value={approvalDetails.doctorId}
                  onChange={(e) => setApprovalDetails(prev => ({...prev, doctorId: e.target.value}))}
                  className="input-field"
                  required
                >
                  <option value="">Select a doctor</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
{(() => { const dn = getDoctorName(doctor); return /^Dr/i.test(dn) ? `${dn} (ID: ${doctor.id})` : `Dr. ${dn} (ID: ${doctor.id})` })()}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={approvalDetails.date}
                  onChange={(e) => setApprovalDetails(prev => ({...prev, date: e.target.value}))}
                  className="input-field"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={approvalDetails.startTime}
                    onChange={(e) => setApprovalDetails(prev => ({...prev, startTime: e.target.value}))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={approvalDetails.endTime}
                    onChange={(e) => setApprovalDetails(prev => ({...prev, endTime: e.target.value}))}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Number
                </label>
                <input
                  type="text"
                  value={approvalDetails.roomNumber}
                  onChange={(e) => setApprovalDetails(prev => ({...prev, roomNumber: e.target.value}))}
                  className="input-field"
                  placeholder="e.g., 101, 202A"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={approvalDetails.notes}
                  onChange={(e) => setApprovalDetails(prev => ({...prev, notes: e.target.value}))}
                  className="input-field"
                  rows="3"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmApproval}
                className="btn-primary"
              >
                Approve & Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reschedule Appointment
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Patient: {getPatientName(selectedAppointment)}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={rescheduleDetails.appointmentDate}
                  onChange={(e) => setRescheduleDetails(prev => ({...prev, appointmentDate: e.target.value}))}
                  className="input-field"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={rescheduleDetails.startTime}
                    onChange={(e) => setRescheduleDetails(prev => ({...prev, startTime: e.target.value}))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={rescheduleDetails.endTime}
                    onChange={(e) => setRescheduleDetails(prev => ({...prev, endTime: e.target.value}))}
                    className="input-field"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doctor
                </label>
                <select
                  value={rescheduleDetails.doctorId}
                  onChange={(e) => setRescheduleDetails(prev => ({...prev, doctorId: e.target.value}))}
                  className="input-field"
                >
                  <option value="">Keep current doctor</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
{(() => { const dn = getDoctorName(doctor); return /^Dr/i.test(dn) ? dn : `Dr. ${dn}` })()}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Number
                </label>
                <input
                  type="text"
                  value={rescheduleDetails.roomNumber}
                  onChange={(e) => setRescheduleDetails(prev => ({...prev, roomNumber: e.target.value}))}
                  className="input-field"
                  placeholder="e.g., 101, 202A"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={rescheduleDetails.notes}
                  onChange={(e) => setRescheduleDetails(prev => ({...prev, notes: e.target.value}))}
                  className="input-field"
                  rows="3"
                  placeholder="Reason for rescheduling..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmReschedule}
                className="btn-primary"
              >
                Reschedule Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReceptionistAppointments