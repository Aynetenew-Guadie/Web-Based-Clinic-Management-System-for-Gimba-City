import React, { useState, useEffect } from 'react'
import { CreditCard, DollarSign, Loader, Search, Filter, Download, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/apiService'
import toast from 'react-hot-toast'

const AdminBilling = () => {
  const { user } = useAuth()
  const [overview, setOverview] = useState({ 
    today: 0, 
    month: 0, 
    pending: 0, 
    totalPatients: 0,
    averageBill: 0 
  })
  const [invoices, setInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDate, setFilterDate] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('month')

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setIsLoading(true)
        
        // Make a single API call and handle the response properly
        const response = await api.get('/reception/billing')
        const billingData = response.data

        console.log('Raw billing API response:', billingData)
        console.log('Type of billingData:', typeof billingData)
        console.log('Is array?', Array.isArray(billingData))

        // FIX: Handle different possible response structures
        let invoicesArray = []
        
        if (Array.isArray(billingData)) {
          // If the response is directly an array
          invoicesArray = billingData
        } else if (billingData && typeof billingData === 'object') {
          // If it's an object, check for common properties that might contain the array
          const possibleArrayProps = ['records', 'bills', 'data', 'invoices', 'billingRecords', 'payments']
          
          for (const prop of possibleArrayProps) {
            if (Array.isArray(billingData[prop])) {
              invoicesArray = billingData[prop]
              console.log(`Found invoices in property: ${prop}`)
              break
            }
          }
          
          // If no array found in common properties, try Object.values
          if (invoicesArray.length === 0) {
            const values = Object.values(billingData)
            // Filter to only include objects that look like invoice records
            invoicesArray = values.filter(item => 
              item && typeof item === 'object' && (item.patient || item.amount || item.status || item.invoice_number)
            )
          }
        }

        console.log('Processed invoices array:', invoicesArray)
        setInvoices(invoicesArray)
        
        // Calculate overview statistics
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        
        const todayRevenue = invoicesArray
          .filter(bill => {
            const billDate = new Date(bill.date || bill.createdAt || bill.bill_date)
            return billDate >= today && (bill.status === 'paid' || bill.payment_status === 'paid')
          })
          .reduce((sum, bill) => sum + (parseFloat(bill.paid_amount || bill.amount_paid || bill.amount || 0)), 0)
          
        const monthRevenue = invoicesArray
          .filter(bill => {
            const billDate = new Date(bill.date || bill.createdAt || bill.bill_date)
            return billDate >= thisMonth && (bill.status === 'paid' || bill.payment_status === 'paid')
          })
          .reduce((sum, bill) => sum + (parseFloat(bill.paid_amount || bill.amount_paid || bill.amount || 0)), 0)
          
        const pendingAmount = invoicesArray
          .filter(bill => bill.status === 'pending' || bill.payment_status === 'pending')
          .reduce((sum, bill) => sum + (parseFloat(bill.amount || bill.total_amount || bill.bill_amount || 0)), 0)
          
        const uniquePatients = new Set(
          invoicesArray
            .map(bill => bill.patient?.id || bill.patient_id || bill.patientId)
            .filter(id => id != null)
        ).size
        
        const averageBill = invoicesArray.length > 0 ? 
          invoicesArray.reduce((sum, bill) => sum + (parseFloat(bill.amount || bill.total_amount || bill.bill_amount || 0)), 0) / invoicesArray.length : 0
        
        setOverview({
          today: todayRevenue,
          month: monthRevenue,
          pending: pendingAmount,
          totalPatients: uniquePatients,
          averageBill: averageBill
        })

      } catch (error) {
        console.error('Error fetching billing data:', error)
        toast.error('Failed to load billing data')
        setOverview({ today: 0, month: 0, pending: 0, totalPatients: 0, averageBill: 0 })
        setInvoices([])
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchBillingData()
    }
  }, [user, selectedPeriod])

  // FIX: Safe filtering with proper fallbacks
  const filteredInvoices = invoices.filter(invoice => {
    const patient = invoice.patient || {}
    const patientName = getPatientName(patient).toLowerCase()
    const invoiceNumber = (invoice.invoice_number || invoice.invoiceNumber || '').toLowerCase()
    const searchLower = searchTerm.toLowerCase()
    
    const matchesSearch = 
      patientName.includes(searchLower) ||
      invoiceNumber.includes(searchLower) ||
      (patient.username && patient.username.toLowerCase().includes(searchLower)) ||
      (patient.first_name && patient.first_name.toLowerCase().includes(searchLower)) ||
      (patient.last_name && patient.last_name.toLowerCase().includes(searchLower))

    const invoiceStatus = invoice.status || invoice.payment_status || 'unknown'
    const matchesStatus = filterStatus === 'all' || invoiceStatus === filterStatus
    
    const invoiceDate = invoice.date || invoice.createdAt || invoice.bill_date
    const matchesDate = !filterDate || invoiceDate === filterDate

    return matchesSearch && matchesStatus && matchesDate
  })

  const exportBilling = () => {
    toast.success('Export functionality would be implemented here')
  }

  const getStatusColor = (status) => {
    const statusValue = status || 'unknown'
    switch (statusValue) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'partial':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    const statusValue = status || 'unknown'
    switch (statusValue) {
      case 'paid':
        return 'Paid'
      case 'pending':
        return 'Pending'
      case 'overdue':
        return 'Overdue'
      case 'partial':
        return 'Partial'
      case 'cancelled':
        return 'Cancelled'
      default:
        return statusValue.charAt(0).toUpperCase() + statusValue.slice(1)
    }
  }

  const getPatientName = (patient) => {
    if (!patient) return 'Unknown Patient'
    
    if (patient.first_name && patient.last_name) {
      return `${patient.first_name} ${patient.last_name}`
    }
    if (patient.name) {
      return patient.name
    }
    return patient.username || 'Unknown Patient'
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB'
    }).format(amount || 0)
  }

  const getPeriodLabel = (period) => {
    switch (period) {
      case 'today':
        return 'Today'
      case 'week':
        return 'This Week'
      case 'month':
        return 'This Month'
      case 'quarter':
        return 'This Quarter'
      case 'year':
        return 'This Year'
      default:
        return 'This Month'
    }
  }

  const getPeriodAmount = (period) => {
    switch (period) {
      case 'today':
        return overview.today
      case 'week':
        // Calculate week amount if needed, otherwise use month
        return overview.month
      case 'month':
        return overview.month
      case 'quarter':
        // Calculate quarter amount if needed, otherwise use month * 3
        return overview.month * 3
      case 'year':
        // Calculate year amount if needed, otherwise use month * 12
        return overview.month * 12
      default:
        return overview.month
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Overview</h1>
          <p className="text-gray-600">Financial statistics and invoices</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input-field"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button 
            onClick={exportBilling}
            className="btn-primary flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Billing Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Collected {getPeriodLabel(selectedPeriod)}</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(getPeriodAmount(selectedPeriod))}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">This Month</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(overview.month)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="card bg-amber-50 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600">Pending</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(overview.pending)}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="card bg-purple-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600">Total Patients</p>
              <p className="text-2xl font-bold text-purple-600">
                {overview.totalPatients.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card bg-indigo-50 border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-600">Average Bill</p>
              <p className="text-2xl font-bold text-indigo-600">
                {formatCurrency(overview.averageBill)}
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices by patient or invoice number..."
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
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="partial">Partial</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Invoices</h2>
        <div className="space-y-3">
          {filteredInvoices.length > 0 ? (
            filteredInvoices.map(invoice => {
              const patient = invoice.patient || {}
              const invoiceAmount = parseFloat(invoice.amount || invoice.total_amount || invoice.bill_amount || 0)
              const paidAmount = parseFloat(invoice.paid_amount || invoice.amount_paid || 0)
              const invoiceStatus = invoice.status || invoice.payment_status || 'unknown'
              const invoiceDate = invoice.date || invoice.createdAt || invoice.bill_date
              const dueDate = invoice.due_date || invoice.dueDate
              const invoiceNumber = invoice.invoice_number || invoice.invoiceNumber

              return (
                <div key={invoice.id || invoice.invoice_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <p className="font-medium text-gray-900">
                        {getPatientName(patient)}
                      </p>
                      {invoiceNumber && (
                        <span className="text-sm text-gray-500">
                          #{invoiceNumber}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 mt-1">
                      <p className="text-sm text-gray-600">
                        {invoiceDate ? new Date(invoiceDate).toLocaleDateString() : 'Date not available'}
                      </p>
                      {dueDate && (
                        <p className="text-sm text-gray-500">
                          Due: {new Date(dueDate).toLocaleDateString()}
                        </p>
                      )}
                      {invoice.description && (
                        <p className="text-sm text-gray-600">
                          {invoice.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(invoiceAmount)}
                      </p>
                      {paidAmount > 0 && (
                        <p className="text-sm text-green-600">
                          Paid: {formatCurrency(paidAmount)}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoiceStatus)}`}>
                      {getStatusText(invoiceStatus)}
                    </span>
                    <button className="btn-secondary text-sm px-3 py-1">View</button>
                    <button className="btn-primary text-sm px-3 py-1">Invoice</button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filterStatus !== 'all' || filterDate ? 'No invoices found' : 'No invoices available'}
              </h3>
              <p className="text-gray-600">
                {searchTerm || filterStatus !== 'all' || filterDate
                  ? 'No invoices match your current search criteria.'
                  : 'No invoices have been created yet.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminBilling