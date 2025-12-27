import React, { useState, useEffect } from 'react'
import { Users, UserCog, CreditCard, BarChart3, Loader } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getUserStats, getBillingStats } from '../../services/adminService'
import toast from 'react-hot-toast'

const AdminHome = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({ 
    users: 0, 
    staff: 0, 
    revenueMonth: 0, 
    activePatients: 0 
  })
  const [recentActivity, setRecentActivity] = useState({
    users: [],
    billing: []
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setIsLoading(true)
        
        const [userStats, billingStats] = await Promise.all([
          getUserStats(),
          getBillingStats()
        ]);

        // If main endpoints returned empty objects, try the admin overview endpoint as a fallback
        const isEmptyStats = Object.keys(userStats).length === 0 && Object.keys(billingStats).length === 0;
        let overview = {};
        if (isEmptyStats) {
          // dynamic import to avoid circular issues
          const { getAdminOverview } = await import('../../services/adminService');
          overview = await getAdminOverview();
        }

        setStats({
          users: userStats.total || overview.totalUsers || 0,
          staff: userStats.staff || overview.staffMembers || 0,
          revenueMonth: billingStats.monthlyRevenue || overview.monthlyRevenue || 0,
          activePatients: userStats.activePatients || overview.activePatients || 0
        });

        setRecentActivity({
          users: [
            '+ New doctor added',
            `+ ${userStats.activePatients || overview.activePatients || 0} patients registered`,
            `~ ${userStats.staff || overview.staffMembers || 0} staff members active`
          ],
          billing: [
            `$ ${(billingStats.dailyRevenue || 0).toLocaleString()} collected today`,
            `${billingStats.completedAppointments || 0} appointments completed this month`,
            `$ ${(billingStats.pendingInvoices || 0).toLocaleString()} pending revenue`,
            `${billingStats.pendingAppointments || 0} scheduled appointments`
          ]
        });

      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast.error('Failed to load system data');
        
        setStats({
          users: 0,
          staff: 0,
          revenueMonth: 0,
          activePatients: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchAdminData();
    }
  }, [user]);

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
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.username || 'Admin'}!</h1>
        <p className="text-gray-600">System overview and quick actions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Active Patients</p>
            <p className="text-2xl font-bold text-blue-600">{stats.activePatients}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Users</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.users}</p>
          </div>
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
            <UserCog className="h-6 w-6 text-indigo-600" />
          </div>
        </div>
        
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Staff</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.staff}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Users className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
        
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Revenue (Mo)</p>
            <p className="text-2xl font-bold text-amber-600">${stats.revenueMonth.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-amber-600" />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Users</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {recentActivity.users.map((activity, index) => (
                <li key={index}>{activity}</li>
              ))}
            </ul>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Billing</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {recentActivity.billing.map((activity, index) => (
                <li key={index}>{activity}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminHome

