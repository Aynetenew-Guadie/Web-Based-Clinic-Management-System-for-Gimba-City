import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Calendar, Users, CreditCard, Clock, RefreshCw, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import Layout from '../layout/Layout';
import ReceptionistAppointments from './ReceptionistAppointments';
import ReceptionistPatients from './ReceptionistPatients';
import ReceptionistBilling from './ReceptionistBilling';
import ReceptionistQueue from './ReceptionistQueue';
import { 
  getScheduledAppointments, 
  getAppointmentRequests, 
  getPatients, 
  getPatientQueue,
  getAvailableDoctors 
} from '../../services/receptionistService';
import toast from 'react-hot-toast';

const ReceptionistDashboardHome = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingRequests: 0,
    totalPatients: 0,
    waitingPatients: 0,
    completedToday: 0,
    upcomingAppointments: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      console.log('Starting dashboard data fetch...');
      setIsLoading(true);
      
      try {
        // Use Promise.allSettled to handle potential API failures gracefully
        const [scheduledAppts, appointmentReqs, patientsData, queueData, doctorsData] = await Promise.allSettled([
          getScheduledAppointments(),
          getAppointmentRequests(),
          getPatients(),
          getPatientQueue(),
          getAvailableDoctors()
        ]);

        const today = new Date();
        const todayString = today.toISOString().split('T')[0];

        // Extract data safely from responses
        const appointments = scheduledAppts.status === 'fulfilled' ? 
          (scheduledAppts.value?.data || scheduledAppts.value || []) : [];
        
        const requests = appointmentReqs.status === 'fulfilled' ? 
          (appointmentReqs.value?.data || appointmentReqs.value || []) : [];
        
        const patients = patientsData.status === 'fulfilled' ? 
          (patientsData.value?.data || patientsData.value || []) : [];
        
        const queue = queueData.status === 'fulfilled' ? 
          (queueData.value?.data || queueData.value || []) : [];
        
        const doctors = doctorsData.status === 'fulfilled' ? 
          (doctorsData.value?.data || doctorsData.value || []) : [];

        console.log('Processing data:', {
          appointments: appointments.length,
          requests: requests.length,
          patients: patients.length,
          queue: queue.length,
          doctors: doctors.length
        });

        // Calculate stats
        const todayAppointments = appointments.filter(apt => {
          const aptDate = apt.appointment_date || apt.date;
          return aptDate && aptDate.startsWith(todayString);
        }).length;

        const pendingRequests = requests.filter(req => 
          req.status === 'pending' || req.status === 'requested'
        ).length;

        const totalPatients = patients.length;

        const waitingPatients = queue.filter(patient => 
          patient.status === 'waiting' || patient.status === 'checked_in'
        ).length;

        const completedToday = queue.filter(patient => {
          const completedDate = patient.completed_at || patient.updated_at || patient.createdAt;
          return patient.status === 'completed' && 
                 new Date(completedDate).toISOString().split('T')[0] === todayString;
        }).length;

        const upcomingAppointments = appointments.filter(apt => {
          const aptDate = apt.appointment_date || apt.date;
          return aptDate && new Date(aptDate) >= today;
        }).length;

        const finalStats = {
          todayAppointments,
          pendingRequests,
          totalPatients,
          waitingPatients,
          completedToday,
          upcomingAppointments
        };

        console.log('Setting final stats:', finalStats);
        setStats(finalStats);

        // Generate recent activity
        const activity = [
          ...queue.slice(0, 2).map(patient => ({
            type: 'queue',
            message: `${patient.patient?.first_name || patient.patient?.username || 'Patient'} checked in`,
            time: patient.check_in_time || patient.createdAt,
            status: 'info'
          })),
          ...requests.slice(0, 2).map(req => ({
            type: 'request',
            message: `New appointment request from ${req.patient?.first_name || req.patient?.username || 'Patient'}`,
            time: req.created_at || req.createdAt,
            status: 'warning'
          })),
          ...appointments.slice(0, 1).map(apt => ({
            type: 'appointment',
            message: `Appointment scheduled with Dr. ${apt.doctor?.first_name || apt.doctor?.username || 'Doctor'}`,
            time: apt.created_at || apt.createdAt,
            status: 'success'
          }))
        ]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 4);

        setRecentActivity(activity);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [refreshKey]);

  useEffect(() => {
    // Auto-refresh every 2 minutes
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 120000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.success('Refreshing data...');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Clock className="h-4 w-4 text-blue-500" />;
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

  console.log('ReceptionistDashboardHome rendering with stats:', stats);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receptionist Dashboard</h1>
          <p className="text-gray-600">Manage patient appointments and queue</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Appointments */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayAppointments}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.upcomingAppointments} upcoming
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
              <p className="text-xs text-gray-500 mt-1">
                Need approval
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Total Patients */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
              <p className="text-xs text-gray-500 mt-1">
                In system
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Waiting Patients */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Waiting Now</p>
              <p className="text-2xl font-bold text-gray-900">{stats.waitingPatients}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.completedToday} completed today
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <UserPlus className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/reception/appointments')}
              className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200 group"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-4">
                  <span className="font-medium text-gray-900 group-hover:text-blue-700">Schedule Appointment</span>
                  <p className="text-sm text-gray-600">Book new patient appointment</p>
                </div>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/reception/patients')}
              className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors duration-200 group"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-4">
                  <span className="font-medium text-gray-900 group-hover:text-green-700">Register New Patient</span>
                  <p className="text-sm text-gray-600">Add patient to system</p>
                </div>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/reception/billing')}
              className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors duration-200 group"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <CreditCard className="h-5 w-5 text-red-600" />
                </div>
                <div className="ml-4">
                  <span className="font-medium text-gray-900 group-hover:text-red-700">Process Payment</span>
                  <p className="text-sm text-gray-600">Handle billing and payments</p>
                </div>
              </div>
            </button>

            <button 
              onClick={() => navigate('/reception/queue')}
              className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors duration-200 group"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-4">
                  <span className="font-medium text-gray-900 group-hover:text-purple-700">Manage Queue</span>
                  <p className="text-sm text-gray-600">View and manage patient queue</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
              Live
            </span>
          </div>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {activity.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTime(activity.time)}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(activity.status)}`}>
                      {activity.type}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No recent activity</p>
                <p className="text-sm mt-1">Activity will appear here as patients check in</p>
              </div>
            )}
            
            {/* Static fallback activities if no real data */}
            {recentActivity.length === 0 && !isLoading && (
              <>
                <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">System initialized and ready</p>
                    <p className="text-xs text-gray-500 mt-1">Just now</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    system
                  </span>
                </div>
                <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-500 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Welcome to Receptionist Dashboard</p>
                    <p className="text-xs text-gray-500 mt-1">Today</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    info
                  </span>
                </div>
              </>
            )}
          </div>
          
          {recentActivity.length > 0 && (
            <button 
              onClick={() => navigate('/reception/appointments')}
              className="w-full mt-4 text-center py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All Activity →
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-700">Loading dashboard data...</span>
          </div>
        </div>
      )}
    </div>
  );
};

const ReceptionistDashboard = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ReceptionistDashboardHome />} />
        <Route path="/appointments" element={<ReceptionistAppointments />} />
        <Route path="/patients" element={<ReceptionistPatients />} />
        <Route path="/billing" element={<ReceptionistBilling />} />
        <Route path="/queue" element={<ReceptionistQueue />} />
      </Routes>
    </Layout>
  );
};

export default ReceptionistDashboard;