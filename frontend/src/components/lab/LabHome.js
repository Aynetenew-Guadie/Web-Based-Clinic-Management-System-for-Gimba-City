import React, { useState, useEffect } from 'react'
import { FlaskConical, ClipboardCheck, Clock, FileText, Loader } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getPendingTests, getInProgressTests, getCompletedTests } from '../../services/labService'
import toast from 'react-hot-toast'
import { getPatientName } from '../../utils/nameHelpers'

const LabHome = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({ 
    pending: 0, 
    processing: 0, 
    completedToday: 0 
  })
  const [recent, setRecent] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLabData = async () => {
      try {
        setIsLoading(true)
        
        const [pendingTests, inProgressTests, completedTests] = await Promise.all([
          getPendingTests(),
          getInProgressTests(),
          getCompletedTests()
        ])

        const pending = pendingTests.length
        const processing = inProgressTests.length
        
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const completedToday = completedTests.filter(test => {
          const testDate = new Date(test.completedAt || test.updatedAt)
          return testDate >= today
        }).length

        setStats({ pending, processing, completedToday })

        const allTests = [...pendingTests, ...inProgressTests, ...completedTests.slice(0, 3)]
        setRecent(allTests.slice(0, 5))

      } catch (error) {
        console.error('Error fetching lab data:', error)
        toast.error('Failed to load lab data')
        setStats({ pending: 0, processing: 0, completedToday: 0 })
        setRecent([])
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchLabData()
    }
  }, [user])

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'in_progress':
        return 'Processing'
      case 'completed':
        return 'Completed'
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.username || 'Lab Technician'}!</h1>
        <p className="text-gray-600">Overview of lab workload</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Pending Tests</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
        </div>
        
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Processing</p>
            <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <FlaskConical className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Completed Today</p>
            <p className="text-2xl font-bold text-green-600">{stats.completedToday}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <ClipboardCheck className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recent.length > 0 ? (
            recent.map(test => (
              <div key={test.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {test.testType || test.labRequest?.testType || 'Lab Test'}
                    </p>
                    <p className="text-sm text-gray-600">{getPatientName(test)}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(test.status)}`}>
                  {getStatusText(test.status)}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FlaskConical className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No recent lab activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LabHome

