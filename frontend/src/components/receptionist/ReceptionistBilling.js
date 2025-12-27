import React, { useState, useEffect } from 'react';
import { Search, Download, CreditCard, Calendar, User, DollarSign, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getAllBilling } from '../../services/receptionistService';
import { getPatientName } from '../../utils/nameHelpers';
import toast from 'react-hot-toast';

const ReceptionistBilling = () => {
  const { user } = useAuth();
  const [billingData, setBillingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setIsLoading(true);
        const data = await getAllBilling();
        console.log('Billing data received:', data);
        setBillingData(data);
      } catch (error) {
        console.error('Error fetching billing data:', error);
        toast.error('Failed to load billing data');
        // Set default empty structure to prevent errors
        setBillingData({
          overview: {
            totalRevenue: 0,
            pendingPayments: 0,
            collectedToday: 0,
            monthlyTarget: 0
          },
          pendingBills: [],
          recentTransactions: [],
          billingStats: {
            cashPayments: 0,
            cardPayments: 0,
            insurancePayments: 0,
            outstandingAmount: 0
          }
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchBillingData();
    }
  }, [user]);

  // FIXED: Safe array access with fallback
  const billingRecords = billingData?.pendingBills || [];
  const recentTransactions = billingData?.recentTransactions || [];
  const overview = billingData?.overview || {};
  const billingStats = billingData?.billingStats || {};

  // FIXED: Safe filtering
  const filteredRecords = billingRecords.filter(record => {
    const patientName = (getPatientName(record) || '').toLowerCase();
    const matchesSearch = patientName.includes(search.toLowerCase()) ||
                         (record.service || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Payments</h1>
          <p className="text-gray-600">Manage patient billing and payment records</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(overview.totalRevenue || 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(overview.pendingPayments || 0)}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Collected Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(overview.collectedToday || 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Target</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(overview.monthlyTarget || 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Download className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Bills Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Pending Bills</h2>
              <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded">
                {filteredRecords.length} bills
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    className="input-field pl-10"
                    placeholder="Search by patient or service..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              {filteredRecords.length > 0 ? (
                <div className="space-y-3">
                  {filteredRecords.map(record => (
                    <div key={record.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <User className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{getPatientName(record)}</h3>
                          <p className="text-sm text-gray-600">{record.service}</p>
                          <p className="text-xs text-gray-500">Due: {record.dueDate}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(record.amount)}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {search || statusFilter !== 'all' ? 'No matching bills found' : 'No pending bills'}
                  </h3>
                  <p className="text-gray-600">
                    {search || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filter criteria'
                      : 'All bills have been processed and paid.'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions & Stats */}
        <div className="space-y-6">
          {/* Recent Transactions */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h2>
            <div className="space-y-3">
              {recentTransactions.length > 0 ? (
                recentTransactions.map(transaction => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{getPatientName(transaction)}</p>
                      <p className="text-sm text-gray-600">{transaction.type} • {transaction.method}</p>
                      <p className="text-xs text-gray-500">{transaction.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                        Completed
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-600">No recent transactions</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Statistics */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Statistics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cash Payments</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(billingStats.cashPayments || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Card Payments</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(billingStats.cardPayments || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Insurance Payments</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(billingStats.insurancePayments || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-gray-600 font-medium">Outstanding</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(billingStats.outstandingAmount || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceptionistBilling;