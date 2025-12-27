import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, User, Plus, Phone, Loader, TrendingUp, AlertCircle, CheckCircle, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext';
import { 
  getPatientQueue, 
  getAppointmentRequests,
  getPatients,
  getScheduledAppointments,
  getAvailableDoctors
} from '../../services/receptionistService';
import toast from 'react-hot-toast';

const ReceptionistHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalPatients: 0,
    waitingPatients: 0,
    completedToday: 0,
    newRegistrations: 0,
    avgWaitTime: 0,
    upcomingAppointments: 0,
    emergencyQueue: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickActions] = useState([
    {
      title: 'Register New Patient',
      description: 'Add a new patient to the system',
      icon: UserPlus,
      color: 'bg-blue-500',
      action: () => navigate('/reception/patients'),
      shortcut: 'Ctrl+N'
    },
    {
      title: 'Schedule Appointment',
      description: 'Book appointment for patient',
      icon: Calendar,
      color: 'bg-green-500',
      action: () => navigate('/reception/appointments'),
      shortcut: 'Ctrl+A'
    },
    {
      title: 'Manage Queue',
      description: 'View and manage patient queue',
      icon: Users,
      color: 'bg-purple-500',
      action: () => navigate('/reception/queue'),
      shortcut: 'Ctrl+Q'
    },
    {
      title: 'Call Next Patient',
      description: 'Call next patient in queue',
      icon: Phone,
      color: 'bg-orange-500',
      action: () => navigate('/reception/queue'),
      shortcut: 'Ctrl+Space'
    }
  ]);

  useEffect(() => {
    const fetchReceptionData = async () => {
      try {
        setIsLoading(true);
      
        // Use Promise.allSettled to handle potential API failures gracefully
        const [patientQueue, appointmentRequests, patients, scheduledAppointments, doctors] = await Promise.allSettled([
          getPatientQueue(),
          getAppointmentRequests(),
          getPatients(),
          getScheduledAppointments(),
          getAvailableDoctors()
        ]);

        // Safely extract data from responses
        const queue = patientQueue.status === 'fulfilled' ? 
          (patientQueue.value?.data || patientQueue.value || []) : [];
        
        const requests = appointmentRequests.status === 'fulfilled' ? 
          (appointmentRequests.value?.data || appointmentRequests.value || []) : [];
        
        const allPatients = patients.status === 'fulfilled' ? 
          (patients.value?.data || patients.value || []) : [];
        
        const scheduled = scheduledAppointments.status === 'fulfilled' ? 
          (scheduledAppointments.value?.data || scheduledAppointments.value || []) : [];
        
        const allDoctors = doctors.status === 'fulfilled' ? 
          (doctors.value?.data || doctors.value || []) : [];

        const today = new Date();
        const todayString = today.toDateString();
        
        // Calculate stats
        const waitingPatients = queue.filter(patient => 
          patient.status === 'waiting' || patient.status === 'checked_in'
        ).length;
        
        const completedToday = queue.filter(patient => {
          const completedDate = patient.completed_at || patient.updated_at || patient.createdAt;
          return patient.status === 'completed' && 
                 new Date(completedDate).toDateString() === todayString;
        }).length;
        
        // Today's appointments from scheduled appointments
        const todayAppointments = scheduled.filter(appointment => {
          const appointmentDate = new Date(appointment.appointment_date || appointment.date);
          return appointmentDate.toDateString() === todayString;
        }).length;

        // New registrations today
        const newRegistrations = allPatients.filter(patient => {
          const regDate = new Date(patient.created_at || patient.createdAt || patient.registered_date);
          return regDate.toDateString() === todayString;
        }).length;

        // Upcoming appointments (today and future)
        const upcomingAppointmentsCount = scheduled.filter(appointment => {
          const appointmentDate = new Date(appointment.appointment_date || appointment.date);
          return appointmentDate >= today;
        }).length;

        // Emergency/high priority patients
        const emergencyQueue = queue.filter(p => 
          p.priority === 'high' || p.urgency === 'emergency'
        ).length;

        // Calculate average wait time (simplified)
        const avgWaitTime = calculateAverageWaitTime(queue);

        setStats({
          todayAppointments,
          totalPatients: allPatients.length,
          waitingPatients,
          completedToday,
          newRegistrations,
          avgWaitTime,
          upcomingAppointments: upcomingAppointmentsCount,
          emergencyQueue
        });

        // Recent patients (first 5 from queue)
        setRecentPatients(queue.slice(0, 5));
        
        // Set upcoming appointments for display
        setUpcomingAppointments(scheduled
          .filter(apt => new Date(apt.appointment_date || apt.date) >= today)
          .slice(0, 5)
        );
        
        // Recent activity
        const activity = [
          ...queue.slice(0, 3).map(p => ({
            type: 'queue',
            message: `${p.patient?.first_name || p.patient?.username || 'Patient'} ${getQueueAction(p.status)}`,
            time: p.check_in_time || p.updated_at || p.createdAt,
            status: p.status,
            patientName: p.patient?.first_name || p.patient?.username || 'Patient'
          })),
          ...requests.slice(0, 2).map(r => ({
            type: 'appointment',
            message: `New appointment request from ${r.patient?.first_name || r.patient?.username || 'Patient'}`,
            time: r.created_at || r.createdAt,
            status: 'pending',
            patientName: r.patient?.first_name || r.patient?.username || 'Patient'
          })),
          ...scheduled.slice(0, 2).map(apt => ({
            type: 'scheduled',
            message: `Appointment scheduled for ${apt.patient?.first_name || apt.patient?.username || 'Patient'}`,
            time: apt.created_at || apt.createdAt,
            status: 'scheduled',
            patientName: apt.patient?.first_name || apt.patient?.username || 'Patient'
          }))
        ]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 6);
        
        setRecentActivity(activity);

      } catch (error) {
        console.error('Error fetching reception data:', error);
        toast.error('Failed to load reception data');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchReceptionData();
    }
  }, [user]);

  // Helper function to calculate average wait time
  const calculateAverageWaitTime = (queue) => {
    const completedAppointments = queue.filter(p => p.status === 'completed');
    if (completedAppointments.length === 0) return 0;

    const totalWaitTime = completedAppointments.reduce((total, patient) => {
      const checkInTime = new Date(patient.check_in_time || patient.createdAt);
      const completionTime = new Date(patient.completed_at || patient.updated_at);
      const waitTime = (completionTime - checkInTime) / (1000 * 60); // Convert to minutes
      return total + (waitTime > 0 ? waitTime : 0);
    }, 0);

    return Math.round(totalWaitTime / completedAppointments.length);
  };

  // Helper function for queue actions
  const getQueueAction = (status) => {
    switch (status) {
      case 'waiting':
        return 'joined queue';
      case 'checked_in':
        return 'checked in';
      case 'in_progress':
      case 'in-consultation':
        return 'in consultation';
      case 'completed':
        return 'completed visit';
      default:
        return 'updated status';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-consultation':
      case 'in_progress':
        return 'bg-green-100 text-green-800';
      case 'checked_in':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'scheduled':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'waiting':
        return 'Waiting';
      case 'in-consultation':
      case 'in_progress':
        return 'In Consultation';
      case 'checked_in':
        return 'Checked In';
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'scheduled':
        return 'Scheduled';
      default:
        return status?.replace('_', ' ').charAt(0).toUpperCase() + 
               status?.replace('_', ' ').slice(1) || 'Unknown';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'queue':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'appointment':
        return <Calendar className="h-4 w-4 text-green-500" />;
      case 'scheduled':
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      return new Date(timeString).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return timeString;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return dateString;
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.username || 'Receptionist'}!</h1>
          <p className="text-gray-600">Manage patient flow and appointments</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm text-gray-600">Today</p>
            <p className="font-semibold text-gray-900">{new Date().toLocaleDateString()}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
              <p className="text-2xl font-bold text-blue-600">{stats.todayAppointments}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.upcomingAppointments} upcoming
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalPatients}</p>
              <p className="text-xs text-gray-500 mt-1">
                +{stats.newRegistrations} today
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Waiting Patients</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.waitingPatients}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.emergencyQueue} emergency
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Today</p>
              <p className="text-2xl font-bold text-purple-600">{stats.completedToday}</p>
              <p className="text-xs text-gray-500 mt-1">
                Avg. wait: {stats.avgWaitTime}min
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Patients in Queue */}
        <div className="card lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Current Queue</h2>
            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
              {stats.waitingPatients} waiting
            </span>
          </div>
          <div className="space-y-3">
            {recentPatients.length > 0 ? (
              recentPatients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {patient.patient?.first_name || patient.patient?.username || patient.name || 'Patient Name N/A'}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {patient.doctor?.first_name || patient.doctor?.username || patient.doctor || 'Doctor TBD'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {formatTime(patient.appointment_time || patient.time)}
                    </p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(patient.status)}`}>
                      {getStatusText(patient.status)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No patients in queue</p>
                <p className="text-sm mt-1">All patients have been seen today</p>
              </div>
            )}
          </div>
          {recentPatients.length > 0 && (
            <button 
              onClick={() => navigate('/reception/queue')}
              className="w-full mt-4 btn-primary py-2"
            >
              View Full Queue
            </button>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button 
                  key={index}
                  onClick={action.action}
                  className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors duration-200 group"
                >
                  <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 group-hover:text-primary-700">
                      {action.title}
                    </p>
                    <p className="text-sm text-gray-600">
                      {action.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                      {action.shortcut}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {activity.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTime(activity.time)} • {formatDate(activity.time)}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(activity.status)}`}>
                      {getStatusText(activity.status)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No recent activity</p>
                <p className="text-sm mt-1">Activity will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Appointments Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
            {stats.upcomingAppointments} total
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((appointment) => (
              <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors duration-200">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {appointment.patient?.first_name || appointment.patient?.username || 'Patient'}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      Dr. {appointment.doctor?.first_name || appointment.doctor?.username || 'Doctor'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(appointment.appointment_date || appointment.date)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(appointment.start_time || appointment.time)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                      {getStatusText(appointment.status)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {appointment.visit_type || 'Consultation'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No upcoming appointments</p>
              <p className="text-sm mt-1">Schedule appointments to see them here</p>
            </div>
          )}
        </div>
        {upcomingAppointments.length > 0 && (
          <button 
            onClick={() => navigate('/reception/appointments')}
            className="w-full mt-4 btn-secondary py-2"
          >
            View All Appointments
          </button>
        )}
      </div>
    </div>
  );
};

export default ReceptionistHome;