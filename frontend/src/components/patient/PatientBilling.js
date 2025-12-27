import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, Download, DollarSign, Loader, Search, Filter, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getBillingHistory } from '../../services/patientService';
import { toast } from 'react-hot-toast';

const PatientBilling = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceBill, setInvoiceBill] = useState(null);

  // Billing data is fetched from the backend. Demo/mock data removed.

  useEffect(() => {
    const fetchBillingHistory = async () => {
      try {
        setIsLoading(true);
        const data = await getBillingHistory();
        setBills(Array.isArray(data) ? data : (data?.data || []));
      } catch (error) {
        console.error('Error fetching billing history:', error);
        toast.error('Failed to load billing history. Please try again later.');
        setBills([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchBillingHistory();
    }
  }, [user]);

  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.doctor?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || bill.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPaid = bills.filter(bill => bill.status === 'paid').reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const totalPending = bills.filter(bill => bill.status === 'pending').reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const totalOverdue = bills.filter(bill => bill.status === 'overdue').reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const totalPartial = bills.filter(bill => bill.status === 'partial').reduce((sum, bill) => sum + ((bill.amount || 0) - (bill.paid_amount || 0)), 0);

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      case 'partial':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'overdue':
        return 'Overdue';
      case 'partial':
        return 'Partial Payment';
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB'
    }).format(amount || 0);
  };

  const openInvoice = (bill) => {
    setInvoiceBill(bill);
    setShowInvoice(true);
  };

  const closeInvoice = () => {
    setShowInvoice(false);
    setInvoiceBill(null);
  };

  const downloadInvoice = (bill) => {
    // Create a formatted invoice text file
    const content = `
MEDICAL INVOICE
=================================

PATIENT INFORMATION:
-------------------
Name: ${user?.name || user?.username || 'Unknown Patient'}
Invoice Number: ${bill.invoice_number || 'N/A'}
Invoice Date: ${new Date(bill.date).toLocaleDateString()}
Due Date: ${bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A'}

SERVICE DETAILS:
----------------
Description: ${bill.description || 'Medical Service'}
Service Type: ${bill.service_type || 'General'}
Service Date: ${bill.service_date ? new Date(bill.service_date).toLocaleDateString() : 'N/A'}
Doctor: ${bill.doctor || 'N/A'}

BILLING DETAILS:
----------------
${bill.items && bill.items.length > 0 ? 
  bill.items.map(item => `${item.description}: ${formatCurrency(item.amount)}`).join('\n') 
  : `${bill.description || 'Service'}: ${formatCurrency(bill.amount)}`
}

${bill.items && bill.items.length > 0 ? `
Subtotal: ${formatCurrency(bill.amount)}
` : ''}

TOTAL AMOUNT: ${formatCurrency(bill.amount)}
${bill.paid_amount ? `PAID AMOUNT: ${formatCurrency(bill.paid_amount)}` : ''}
${bill.paid_amount ? `BALANCE DUE: ${formatCurrency(bill.amount - bill.paid_amount)}` : ''}

PAYMENT INFORMATION:
-------------------
Status: ${getStatusText(bill.status)}
${bill.payment_date ? `Payment Date: ${new Date(bill.payment_date).toLocaleDateString()}` : ''}
${bill.payment_method ? `Payment Method: ${bill.payment_method}` : ''}

NOTES:
------
${bill.notes || 'No additional notes'}

=================================
Generated on: ${new Date().toLocaleString()}
This is a computer-generated invoice. For official records, please contact the billing department.
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${bill.invoice_number || bill.id}-${new Date(bill.date).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('Invoice downloaded successfully');
  };

  const makePayment = (bill) => {
    toast.success(`Payment initiated for ${formatCurrency(bill.amount - (bill.paid_amount || 0))}`);
    // In a real app, this would integrate with a payment gateway
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Payments</h1>
          <p className="text-gray-600">View your billing history and manage payments</p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredBills.length} of {bills.length} bills
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-gray-500 mt-1">{bills.filter(bill => bill.status === 'paid').length} paid bills</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Amount</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
              <p className="text-xs text-gray-500 mt-1">{bills.filter(bill => bill.status === 'pending').length} pending</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue Amount</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
              <p className="text-xs text-gray-500 mt-1">{bills.filter(bill => bill.status === 'overdue').length} overdue</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Partial Payments</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalPartial)}</p>
              <p className="text-xs text-gray-500 mt-1">{bills.filter(bill => bill.status === 'partial').length} partial</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search bills by description, invoice number, or service type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field min-w-[150px]"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="partial">Partial</option>
              </select>
            </div>
            {(searchTerm || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                }}
                className="btn-secondary text-sm px-3 py-2"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      

      {/* Bills List */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h2>
        <div className="space-y-4">
          {filteredBills.length > 0 ? (
            filteredBills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {bill.description || 'Medical Service'}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ml-2 ${getStatusColor(bill.status)} flex-shrink-0`}>
                        {getStatusIcon(bill.status)}
                        <span>{getStatusText(bill.status)}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(bill.date).toLocaleDateString()}</span>
                      </span>
                      {bill.due_date && (
                        <>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <span>Due: {new Date(bill.due_date).toLocaleDateString()}</span>
                          </span>
                        </>
                      )}
                      {bill.invoice_number && (
                        <>
                          <span>•</span>
                          <span className="font-medium">#{bill.invoice_number}</span>
                        </>
                      )}
                      {bill.service_type && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{bill.service_type}</span>
                        </>
                      )}
                    </div>
                    {bill.notes && (
                      <p className="text-sm text-gray-500 mt-1">{bill.notes}</p>
                    )}
                    {bill.doctor && (
                      <p className="text-sm text-gray-600 mt-1">Doctor: {bill.doctor}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 ml-4">
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(bill.amount)}
                    </p>
                    {bill.paid_amount && bill.paid_amount > 0 && (
                      <p className="text-sm text-green-600">
                        Paid: {formatCurrency(bill.paid_amount)}
                      </p>
                    )}
                    {bill.status === 'partial' && (
                      <p className="text-sm text-blue-600">
                        Balance: {formatCurrency(bill.amount - bill.paid_amount)}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => openInvoice(bill)}
                      className="btn-secondary text-sm px-3 py-2 flex items-center space-x-1 whitespace-nowrap"
                    >
                      <FileText className="h-4 w-4" />
                      <span>View</span>
                    </button>
                    {(bill.status === 'pending' || bill.status === 'overdue' || bill.status === 'partial') && (
                      <button 
                        onClick={() => makePayment(bill)}
                        className="btn-primary text-sm px-3 py-2 flex items-center space-x-1 whitespace-nowrap"
                      >
                        <DollarSign className="h-4 w-4" />
                        <span>Pay</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filterStatus !== 'all' ? 'No bills found' : 'No billing history available'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'all'
                  ? 'No bills match your current search criteria.'
                  : 'You don\'t have any billing history yet.'
                }
              </p>
              {(searchTerm || filterStatus !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                  }}
                  className="btn-primary"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && invoiceBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Invoice Details</h2>
                <button 
                  onClick={closeInvoice}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Header */}
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold text-primary-600">Gimba clinic</h2>
                  <p className="text-gray-600">Medical Invoice</p>
                </div>

                {/* Invoice Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Patient Information</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Name: </span>
                        <span className="font-medium">{user?.name || user?.username || 'Patient'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Invoice #: </span>
                        <span className="font-medium">{invoiceBill.invoice_number || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Service Date: </span>
                        <span className="font-medium">
                          {invoiceBill.service_date ? new Date(invoiceBill.service_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Billing Information</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Invoice Date: </span>
                        <span className="font-medium">{new Date(invoiceBill.date).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Due Date: </span>
                        <span className="font-medium">
                          {invoiceBill.due_date ? new Date(invoiceBill.due_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status: </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoiceBill.status)}`}>
                          {getStatusText(invoiceBill.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="mb-2">
                      <span className="text-gray-600 font-medium">Description: </span>
                      <span className="font-medium">{invoiceBill.description || 'Medical Service'}</span>
                    </div>
                    {invoiceBill.doctor && (
                      <div className="mb-2">
                        <span className="text-gray-600 font-medium">Doctor: </span>
                        <span>{invoiceBill.doctor}</span>
                      </div>
                    )}
                    {invoiceBill.service_type && (
                      <div className="mb-2">
                        <span className="text-gray-600 font-medium">Service Type: </span>
                        <span className="capitalize">{invoiceBill.service_type}</span>
                      </div>
                    )}
                    {invoiceBill.notes && (
                      <div>
                        <span className="text-gray-600 font-medium">Notes: </span>
                        <span>{invoiceBill.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Charges</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoiceBill.items && invoiceBill.items.length > 0 ? (
                          invoiceBill.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.amount)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-900">{invoiceBill.description || 'Medical Service'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(invoiceBill.amount)}</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">Total:</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(invoiceBill.amount)}</td>
                        </tr>
                        {invoiceBill.paid_amount && invoiceBill.paid_amount > 0 && (
                          <>
                            <tr>
                              <td className="px-4 py-2 text-sm text-green-600 text-right">Paid:</td>
                              <td className="px-4 py-2 text-sm text-green-600 text-right">{formatCurrency(invoiceBill.paid_amount)}</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">Balance Due:</td>
                              <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                                {formatCurrency(invoiceBill.amount - invoiceBill.paid_amount)}
                              </td>
                            </tr>
                          </>
                        )}
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Payment Information */}
                {invoiceBill.payment_date && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Information</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 font-medium">Payment Date: </span>
                          <span>{new Date(invoiceBill.payment_date).toLocaleDateString()}</span>
                        </div>
                        {invoiceBill.payment_method && (
                          <div>
                            <span className="text-gray-600 font-medium">Payment Method: </span>
                            <span>{invoiceBill.payment_method}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button 
                  onClick={() => downloadInvoice(invoiceBill)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Invoice</span>
                </button>
                {(invoiceBill.status === 'pending' || invoiceBill.status === 'overdue' || invoiceBill.status === 'partial') && (
                  <button 
                    onClick={() => makePayment(invoiceBill)}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <DollarSign className="h-4 w-4" />
                    <span>Make Payment</span>
                  </button>
                )}
                <button 
                  onClick={closeInvoice}
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
  );
};

export default PatientBilling;