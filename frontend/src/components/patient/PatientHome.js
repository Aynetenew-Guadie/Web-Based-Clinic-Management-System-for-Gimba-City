import React, { useState, useEffect } from 'react';
import { Calendar, FileText, Pill, FlaskConical, CreditCard, Clock, User, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  getPatientAppointments, 
  getPrescriptions, 
  getLabResults, 
  getBillingHistory 
} from '../../services/patientService';
import { toast } from 'react-hot-toast';

const PatientHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    completedAppointments: 0,
    activePrescriptions: 0,
    pendingLabResults: 0,
    totalBills: 0,
    paidBills: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // No inline mock data — dashboard reads from backend via services

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      let appointments = [];
      let prescriptions = [];
      let labResults = [];
      let billing = [];

      // Fetch real data from services; if any call fails the outer catch will handle it
      [appointments, prescriptions, labResults, billing] = await Promise.all([
        getPatientAppointments(),
        getPrescriptions(),
        getLabResults(),
        getBillingHistory()
      ]);

      // Ensure we have arrays to work with
      appointments = appointments || [];
      prescriptions = prescriptions || [];
      labResults = labResults || [];
      billing = billing || [];

      const upcomingAppts = appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date || apt.date);
        return aptDate > new Date() && (apt.status === 'scheduled' || apt.status === 'upcoming');
      }).length;
      
      const completedAppts = appointments.filter(apt => 
        apt.status === 'completed'
      ).length;

      const activePrescriptions = prescriptions.filter(pres => 
        pres.status === 'active' || !pres.status
      ).length;

      const pendingLabResults = labResults.filter(result => 
        result.status === 'pending' || result.status === 'in_progress'
      ).length;

      const totalBills = billing.length;
      const paidBills = billing.filter(bill => bill.status === 'paid').length;

      setStats({
        upcomingAppointments: upcomingAppts,
        completedAppointments: completedAppts,
        activePrescriptions,
        pendingLabResults,
        totalBills,
        paidBills
      });

      const activities = [];
      
      // Add appointment activities
      appointments.slice(0, 2).forEach(apt => {
        activities.push({
          id: `apt-${apt.id}`,
          type: 'appointment',
          title: `Appointment with Dr. ${apt.doctor?.username || apt.doctorName || 'Doctor'}`,
          description: `${apt.visit_type || apt.type || 'Appointment'} on ${new Date(apt.appointment_date || apt.date).toLocaleDateString()}`,
          time: new Date(apt.createdAt || apt.date).toLocaleDateString(),
          status: apt.status === 'scheduled' ? 'upcoming' : apt.status === 'completed' ? 'completed' : 'active'
        });
      });

      // Add prescription activities
      prescriptions.slice(0, 1).forEach(pres => {
        activities.push({
          id: `pres-${pres.id}`,
          type: 'prescription',
          title: 'New prescription issued',
          description: `${pres.medication || 'Medication'} - ${pres.dosage || 'Dosage'}`,
          time: new Date(pres.dateIssued || pres.createdAt || pres.date).toLocaleDateString(),
          status: 'active'
        });
      });

      // Add lab result activities
      labResults.slice(0, 1).forEach(result => {
        activities.push({
          id: `lab-${result.id}`,
          type: 'lab_result',
          title: 'Lab test results ready',
          description: `${result.testType || result.testName || 'Test'} results available`,
          time: new Date(result.date || result.createdAt).toLocaleDateString(),
          status: result.status === 'completed' ? 'completed' : 'active'
        });
      });

      setRecentActivity(activities);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data from backend');
      // Clear stats and activities so UI shows empty state
      setStats({
        upcomingAppointments: 0,
        completedAppointments: 0,
        activePrescriptions: 0,
        pendingLabResults: 0,
        totalBills: 0,
        paidBills: 0
      });
      setRecentActivity([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'text-blue-600 bg-blue-50';
      case 'active': return 'text-green-600 bg-green-50';
      case 'completed': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'appointment': return <Calendar className="h-5 w-5" />;
      case 'prescription': return <Pill className="h-5 w-5" />;
      case 'lab_result': return <FlaskConical className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const handleContactDoctor = () => {
    toast.success('Contact feature coming soon!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.username || 'Patient'}!</h1>
          <p className="text-gray-600">Here's what's happening with your health today</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-primary-600" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          className="card cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/patient/appointments')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcomingAppointments}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div 
          className="card cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/patient/prescriptions')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Prescriptions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activePrescriptions}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Pill className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div 
          className="card cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/patient/lab-results')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Lab Results</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingLabResults}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FlaskConical className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div 
          className="card cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/patient/billing')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bills</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBills}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div 
          className="card cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/patient/billing')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paid Bills</p>
              <p className="text-2xl font-bold text-gray-900">{stats.paidBills}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div 
          className="card cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/patient/appointments')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Visits</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedAppointments}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusColor(activity.status)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(activity.status)}`}>
                  {activity.status}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No recent activity to display</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => navigate('/patient/appointment-requests')}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors duration-200"
          >
            <Calendar className="h-5 w-5 text-primary-600" />
            <span className="font-medium text-gray-900">Request Appointment</span>
          </button>
          <button 
            onClick={handleContactDoctor}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors duration-200"
          >
            <Phone className="h-5 w-5 text-primary-600" />
            <span className="font-medium text-gray-900">Contact Doctor</span>
          </button>
          <button 
            onClick={() => navigate('/patient/medical-records')}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors duration-200"
          >
            <FileText className="h-5 w-5 text-primary-600" />
            <span className="font-medium text-gray-900">View Records</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientHome;