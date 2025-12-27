import React, { useState, useEffect } from 'react';
import { Calendar, Users, FileText, Pill, FlaskConical, Clock, User, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getTodaysAppointments, 
  getLabRequests, 
  getPrescriptions,
  getDoctorStats 
} from '../../services/doctorService';
import { getPatientName as getPatientNameHelper } from '../../utils/nameHelpers';
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast';

const DoctorHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalPatients: 0,
    pendingLabResults: 0,
    activePrescriptions: 0
  });
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        const [appointmentsData, doctorStatsData] = await Promise.all([
          getTodaysAppointments(),
          getDoctorStats()
        ]);

        console.log('Appointments data:', appointmentsData);
        console.log('Doctor stats data:', doctorStatsData);

        // Safely handle appointments data - ensure it's always an array
        let appointments = [];
        if (Array.isArray(appointmentsData)) {
          appointments = appointmentsData;
        } else if (appointmentsData && Array.isArray(appointmentsData.appointments)) {
          appointments = appointmentsData.appointments;
        } else if (appointmentsData && appointmentsData.data && Array.isArray(appointmentsData.data.appointments)) {
          appointments = appointmentsData.data.appointments;
        } else if (appointmentsData && appointmentsData.data && Array.isArray(appointmentsData.data)) {
          appointments = appointmentsData.data;
        }

        // Safely handle stats data
        let statsData = {};
        if (doctorStatsData && doctorStatsData.stats) {
          statsData = doctorStatsData.stats;
        } else if (doctorStatsData && doctorStatsData.data && doctorStatsData.data.stats) {
          statsData = doctorStatsData.data.stats;
        } else if (doctorStatsData && typeof doctorStatsData === 'object') {
          statsData = doctorStatsData;
        } else if (doctorStatsData && doctorStatsData.data && typeof doctorStatsData.data === 'object') {
          statsData = doctorStatsData.data;
        }

        console.log('Processed appointments:', appointments);
        console.log('Processed stats:', statsData);

        setStats({
          todayAppointments: statsData.todayAppointments || statsData.totalAppointments || appointments.length || 0,
          totalPatients: statsData.totalPatients || statsData.completedPatients || 0,
          pendingLabResults: statsData.pendingLabResults || statsData.pendingLabRequests || 0,
          activePrescriptions: statsData.activePrescriptions || 0
        });

        // Ensure we only slice if it's an array
        const schedule = Array.isArray(appointments) ? appointments.slice(0, 5) : [];
        setTodaySchedule(schedule);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
        
        // Set safe fallback data
        setStats({
          todayAppointments: 0,
          totalPatients: 0,
          pendingLabResults: 0,
          activePrescriptions: 0
        });
        setTodaySchedule([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'scheduled':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'no_show':
      case 'no-show':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      // Handle different time formats
      let time = timeString;
      
      // If it's a full datetime string, extract time part
      if (timeString.includes('T')) {
        time = timeString.split('T')[1]?.substring(0, 5) || timeString;
      }
      
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      if (isNaN(hour)) return timeString;
      
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes || '00'} ${ampm}`;
    } catch (error) {
      console.warn('Error formatting time:', error);
      return timeString;
    }
  };

  const formatStatus = (status) => {
    if (!status) return 'Scheduled';
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  };

  const getPatientName = (appointment) => getPatientNameHelper(appointment);

  const getVisitType = (appointment) => {
    if (appointment.visit_type) return appointment.visit_type.replace(/_/g, ' ');
    if (appointment.visitType) return appointment.visitType.replace(/_/g, ' ');
    if (appointment.reason) return appointment.reason;
    return 'Consultation';
  };

  const getAppointmentTime = (appointment) => {
    if (appointment.start_time) return appointment.start_time;
    if (appointment.time) return appointment.time;
    if (appointment.appointmentTime) return appointment.appointmentTime;
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, Dr. {user?.username || user?.name || 'Doctor'}!
          </h1>
          <p className="text-gray-600">Here's your schedule and overview for today</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
              <p className="text-2xl font-bold text-blue-600">{stats.todayAppointments}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Patients Diagnosed</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalPatients}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Lab Results</p>
              <p className="text-2xl font-bold text-purple-600">{stats.pendingLabResults}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FlaskConical className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Prescriptions</p>
              <p className="text-2xl font-bold text-orange-600">{stats.activePrescriptions}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Pill className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
            <span className="text-sm text-gray-500">
              {todaySchedule.length} appointment{todaySchedule.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-3">
            {todaySchedule.length > 0 ? (
              todaySchedule.map((appointment, index) => (
                <div 
                  key={appointment.id || appointment._id || `appt-${index}`} 
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatTime(getAppointmentTime(appointment))}
                      </p>
                      <p className="text-sm text-gray-600">
                        {getPatientName(appointment)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {getVisitType(appointment)}
                    </p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                      {formatStatus(appointment.status)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No appointments scheduled for today</p>
                <button 
                  onClick={() => navigate('/doctor/appointments')}
                  className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View all appointments
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/doctor/appointments')} 
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900">View Full Schedule</span>
              </div>
              <div className="text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/doctor/patients')} 
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <span className="font-medium text-gray-900">Patient Search</span>
              </div>
              <div className="text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/doctor/medical-notes')} 
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <span className="font-medium text-gray-900">Write Medical Notes</span>
              </div>
              <div className="text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/doctor/prescriptions')} 
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <Pill className="h-5 w-5 text-orange-600" />
                </div>
                <span className="font-medium text-gray-900">Issue Prescription</span>
              </div>
              <div className="text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorHome;