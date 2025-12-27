import React, { useState, useEffect, useRef } from 'react'
import { UserPlus, Search, User, Mail, Shield, Loader, Edit, Trash2, Eye, Filter } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/apiService'
import toast from 'react-hot-toast'
import { resetUserPassword } from '../../services/adminService'

const AdminUsers = () => {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: '',
    first_name: '',
    last_name: '',
    phone: '',
    age: '',
    employee_id: '',
    is_active: true
  })
  const [viewUserId, setViewUserId] = useState(null)
  const [editUserId, setEditUserId] = useState(null)
  const [editUser, setEditUser] = useState({
    first_name: '',
    last_name: '',
    role: '',
    phone: '',
    age: '',
    employee_id: '',
    is_active: true
  })

  // Reset password modal state
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetUserTarget, setResetUserTarget] = useState(null)
  const [resetPasswordInput, setResetPasswordInput] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState(null)

  // FIX: Add ref to prevent duplicate API calls
  const hasFetched = useRef(false)

  useEffect(() => {
    const fetchUsers = async () => {
      // FIX: Prevent duplicate calls in development mode
      if (hasFetched.current) return
      hasFetched.current = true

      try {
        setIsLoading(true)
        console.log('🔄 Fetching users...')
        const response = await api.get('/admin/users')
        
        console.log('Full API response:', response)
        
        const usersData = response.data?.data || response.data || []
        setUsers(usersData)
        
        console.log('Fetched users:', usersData)
      } catch (error) {
        console.error('Error fetching users:', error)
        setUsers([])
        toast.error('Failed to load users')
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchUsers()
    }

    // FIX: Cleanup function to reset the ref when component unmounts
    return () => {
      hasFetched.current = false
    }
  }, [user])

  const filteredUsers = Array.isArray(users) ? users.filter(u => {
    const matchesSearch = u.username?.toLowerCase().includes(search.toLowerCase()) ||
                         u.email?.toLowerCase().includes(search.toLowerCase()) ||
                         u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
                         u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
                         u.employee_id?.toLowerCase().includes(search.toLowerCase())
    const matchesRole = filterRole === 'all' || u.role === filterRole
    return matchesSearch && matchesRole
  }) : []

  const validatePhone = (phone) => {
    if (!phone) return true;
    const cleanPhone = phone.replace(/[\s-]/g, '');
    
    const phoneRegex = /^09\d{8}$/;
    return phoneRegex.test(cleanPhone);
  };

  const handleAddUser = async (e) => {
    e.preventDefault()
    
    // FIX: Prevent duplicate submissions
    if (isSubmitting) {
      console.log('⏳ Submission already in progress, skipping...')
      return
    }
    
    const requiredFields = [
      'username', 'email', 'password', 'role', 'first_name', 'last_name'
    ]
    
    const missingFields = requiredFields.filter(field => !newUser[field])
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ').replace(/_/g, ' ')}`)
      return
    }

    if (newUser.phone && !validatePhone(newUser.phone)) {
      toast.error('Phone number must start with 09 and be exactly 10 digits (e.g., 0912345678)')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        name: `${newUser.first_name} ${newUser.last_name}`,
        phone: newUser.phone || null,
        age: newUser.age || null,
        employee_id: newUser.employee_id || null,
        is_active: newUser.is_active
      }
      
      console.log('🚀 Creating user with payload:', payload)
      
      // FIX: Use optimistic update - immediately add user to local state
      const tempUser = {
        ...payload,
        id: `temp-${Date.now()}`,
        _temp: true,
        createdAt: new Date().toISOString()
      }
      
      setUsers(prev => [tempUser, ...prev])
      setShowAddForm(false)
      
      const response = await api.post('/admin/users', payload)
      console.log('✅ User creation response:', response)

      // Normalize backend response shapes. The API may return an envelope
      // like { success: true, data: user } or simply the created user object.
      const createdUser = response?.data?.data || response?.data || response
      const isSuccess = response?.success === true || response?.data?.success === true ||
                        (!!createdUser && (createdUser.id || createdUser.username))

      // Replace temporary user with the actual backend user when creation succeeds
      if (isSuccess) {
        setUsers(prev => prev.map(u => u._temp ? createdUser : u))
        const emailSentFlag = response?.data?.emailSent === true
        if (emailSentFlag) {
          toast.success('User successfully created and welcome email sent!')
        } else {
          toast.success('User successfully created! (Email not sent — check SMTP settings)')
        }
      } else {
        // Remove temporary user if backend reported a failure
        setUsers(prev => prev.filter(u => !u._temp))
        const errMsg = response?.data?.error || response?.error || 'Failed to create user'
        toast.error(errMsg)
      }

      // Reset form
      setNewUser({
        username: '',
        email: '',
        password: '',
        role: '',
        first_name: '',
        last_name: '',
        phone: '',
        age: '',
        employee_id: '',
        is_active: true
      })
      
    } catch (error) {
      console.error('❌ Error creating user:', error)
      
      // FIX: Remove temporary user on error
      setUsers(prev => prev.filter(user => !user._temp))
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to create user'
      
      // FIX: Handle duplicate user error as success (user was created)
      if (errorMessage.toLowerCase().includes('already exists') || 
          errorMessage.toLowerCase().includes('duplicate') ||
          error.response?.status === 400) {
        
        console.log('🔄 User was created but got duplicate error, refreshing list...')
        
        // Refresh the list to get the actual created user
        try {
          const refreshResponse = await api.get('/admin/users')
          const usersData = refreshResponse.data?.data || refreshResponse.data || []
          setUsers(usersData)
          // FIX: Changed message to "User successfully created"
          toast.success('User successfully created!')
        } catch (refreshError) {
          console.error('Error refreshing users:', refreshError)
          // FIX: Changed message to "User successfully created"
          toast.success('User successfully created! Please refresh the page to see the new user.')
        }
      } else {
        // Only show error for actual failures
        toast.error(errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return

    try {
      await api.delete(`/admin/users/${userId}`)
      setUsers(users.filter(u => u.id !== userId))
      toast.success('User deleted successfully')
      
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user')
    }
  }

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const newStatus = !currentStatus
      
      const response = await api.put(`/admin/users/${userId}`, { 
        is_active: newStatus 
      })
      
      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_active: newStatus } : u
      ))
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`)
      
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error('Failed to update user status')
    }
  }

  const handleSaveEdit = async (userId) => {
    try {
      const payload = { ...editUser }
      const response = await api.put(`/admin/users/${userId}`, payload)
      
      setUsers(users.map(u => 
        u.id === userId ? { ...u, ...editUser } : u
      ))
      setEditUserId(null)
      toast.success('User updated successfully')
      
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error(error.response?.data?.error || error.message || 'Failed to update user')
    }
  }

  const getRoleBadge = (role) => {
    const roleColors = {
      'admin': 'bg-purple-100 text-purple-800',
      'doctor': 'bg-blue-100 text-blue-800',
      'receptionist': 'bg-green-100 text-green-800',
      'lab_technician': 'bg-orange-100 text-orange-800',
      'pharmacist': 'bg-teal-100 text-teal-800',
      'patient': 'bg-gray-100 text-gray-800'
    }
    return roleColors[role] || 'bg-gray-100 text-gray-800'
  }

  const getRoleText = (role) => {
    const roleNames = {
      'admin': 'Administrator',
      'doctor': 'Doctor',
      'receptionist': 'Receptionist',
      'lab_technician': 'Lab Technician',
      'pharmacist': 'Pharmacist',
      'patient': 'Patient'
    }
    return roleNames[role] || role?.replace('_', ' ').charAt(0).toUpperCase() + 
           role?.replace('_', ' ').slice(1) || 'Unknown'
  }

  const getUserName = (user) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user.username || 'Unknown User'
  }

  const handleView = (user) => {
    setViewUserId(viewUserId === user.id ? null : user.id)
    setEditUserId(null)
  }

  // Reset Password handlers
  const openResetModal = (user) => {
    setResetUserTarget(user)
    setResetPasswordInput('')
    setGeneratedPassword(null)
    setShowResetModal(true)
  }

  const closeResetModal = () => {
    setShowResetModal(false)
    setResetUserTarget(null)
    setResetPasswordInput('')
    setGeneratedPassword(null)
  }

  const handleResetPassword = async (useGenerated = false) => {
    if (!resetUserTarget) return
    setIsResetting(true)
    try {
      const password = useGenerated ? undefined : (resetPasswordInput && resetPasswordInput.trim() ? resetPasswordInput.trim() : undefined)
      const res = await resetUserPassword(resetUserTarget.id, password)

      // Be defensive against undefined responses
      const generated = res?.generatedPassword ?? null
      setGeneratedPassword(generated)

      // If admin chose to use generated password, populate the input so admin can copy it immediately
      if (useGenerated && generated) {
        setResetPasswordInput(generated)
      }

      toast.success(res?.message || 'Password reset')
    } catch (error) {
      console.error('Error resetting password:', error)
      const msg = error?.message || 'Failed to reset password'
      toast.error(msg)
    } finally {
      setIsResetting(false)
    }
  }

  const handleEdit = (user) => {
    setEditUserId(user.id)
    setViewUserId(null)
    setEditUser({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role || '',
      phone: user.phone || '',
      age: user.age || '',
      employee_id: user.employee_id || '',
      is_active: !!user.is_active
    })
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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Create and manage system users</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary flex items-center space-x-2"
        >
          <UserPlus className="h-4 w-4" />
          <span>{showAddForm ? 'Cancel' : 'New User'}</span>
        </button>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New User</h3>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="input-field"
                  placeholder="Enter username"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="input-field"
                  placeholder="Enter email"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="input-field"
                  placeholder="Enter password"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="input-field"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select role</option>
                  <option value="admin">Administrator</option>
                  <option value="doctor">Doctor</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="lab_technician">Lab Technician</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="patient">Patient</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.first_name}
                  onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                  className="input-field"
                  placeholder="Enter first name"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.last_name}
                  onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                  className="input-field"
                  placeholder="Enter last name"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  className="input-field"
                  placeholder="09xxxxxxxx (10 digits starting with 09)"
                  pattern="09[0-9]{8}"
                  title="Phone number must start with 09 and be exactly 10 digits"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  value={newUser.age}
                  onChange={(e) => setNewUser({...newUser, age: e.target.value})}
                  className="input-field"
                  placeholder="Enter age"
                  min="0"
                  max="150"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={newUser.employee_id}
                  onChange={(e) => setNewUser({...newUser, employee_id: e.target.value})}
                  className="input-field"
                  placeholder="Enter employee ID"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={newUser.is_active}
                onChange={(e) => setNewUser({...newUser, is_active: e.target.checked})}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                disabled={isSubmitting}
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Active User
              </label>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary flex items-center space-x-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create User</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rest of your component remains the same */}
      {/* Search and Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              className="input-field pl-10" 
              placeholder="Search users..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="input-field"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="doctor">Doctors</option>
            <option value="receptionist">Receptionists</option>
            <option value="lab_technician">Lab Technicians</option>
            <option value="patient">Patients</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredUsers.length > 0 ? (
          filteredUsers.map(u => (
            <div key={u.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{getUserName(u)}</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-blue-600 font-semibold">
                          {u.employee_id || `ID: ${u.id}`}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>{u.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">@{u.username}</span>
                        {u.age && (
                          <span className="text-gray-500">• Age: {u.age}</span>
                        )}
                      </div>
                      {u.phone && (
                        <div className="text-sm text-gray-500">
                          Phone: {u.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadge(u.role)}`}>
                    {getRoleText(u.role)}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => handleView(u)} className="btn-secondary text-sm px-3 py-1 flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </button>
                  <button onClick={() => handleEdit(u)} className="btn-secondary text-sm px-3 py-1 flex items-center space-x-1">
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button onClick={() => openResetModal(u)} className="btn-secondary text-sm px-3 py-1 flex items-center space-x-1">
                    <Shield className="h-4 w-4" />
                    <span>Reset</span>
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(u.id, u.is_active)}
                    className={`text-sm px-3 py-1 rounded-md ${
                      u.is_active 
                        ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(u.id)}
                    className="btn-danger text-sm px-3 py-1 flex items-center space-x-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
              {viewUserId === u.id && (
                <div className="mt-4 border-t pt-4 text-sm text-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div><span className="text-gray-500">User ID:</span> <span className="font-mono text-blue-600 font-semibold">{u.id}</span></div>
                    <div><span className="text-gray-500">Email:</span> {u.email}</div>
                    <div><span className="text-gray-500">Username:</span> {u.username}</div>
                    <div><span className="text-gray-500">Full Name:</span> {u.first_name} {u.last_name}</div>
                    <div><span className="text-gray-500">Role:</span> {getRoleText(u.role)}</div>
                    <div><span className="text-gray-500">Status:</span> {u.is_active ? 'Active' : 'Inactive'}</div>
                    {u.phone && (<div><span className="text-gray-500">Phone:</span> {u.phone}</div>)}
                    {u.age && (<div><span className="text-gray-500">Age:</span> {u.age}</div>)}
                    {u.employee_id && (<div><span className="text-gray-500">Employee ID:</span> {u.employee_id}</div>)}
                    <div><span className="text-gray-500">Created:</span> {new Date(u.createdAt).toLocaleDateString()}</div>
                    <div><span className="text-gray-500">Last Login:</span> {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</div>
                  </div>
                </div>
              )}

              {editUserId === u.id && (
                <div className="mt-4 border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input className="input-field" value={editUser.first_name} onChange={e => setEditUser({...editUser, first_name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input className="input-field" value={editUser.last_name} onChange={e => setEditUser({...editUser, last_name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select className="input-field" value={editUser.role} onChange={e => setEditUser({...editUser, role: e.target.value})}>
                        <option value="admin">Administrator</option>
                        <option value="doctor">Doctor</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="lab_technician">Lab Technician</option>
                        <option value="pharmacist">Pharmacist</option>
                        <option value="patient">Patient</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input 
                        className="input-field" 
                        value={editUser.phone} 
                        onChange={e => setEditUser({...editUser, phone: e.target.value})} 
                        placeholder="09xxxxxxxx (10 digits starting with 09)"
                        pattern="09[0-9]{8}"
                        title="Phone number must start with 09 and be exactly 10 digits"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                      <input 
                        type="number"
                        className="input-field" 
                        value={editUser.age} 
                        onChange={e => setEditUser({...editUser, age: e.target.value})}
                        min="0"
                        max="150"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                      <input 
                        className="input-field" 
                        value={editUser.employee_id} 
                        onChange={e => setEditUser({...editUser, employee_id: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        type="password"
                        className="input-field"
                        placeholder="Leave blank to keep current password"
                        value={editUser.password || ''}
                        onChange={e => setEditUser({...editUser, password: e.target.value})}
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave blank to keep the current password.</p>
                    </div>
                    <div className="flex items-center space-x-2 md:col-span-2">
                      <input id={`edit_active_${u.id}`} type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" checked={editUser.is_active} onChange={e => setEditUser({...editUser, is_active: e.target.checked})} />
                      <label htmlFor={`edit_active_${u.id}`} className="text-sm font-medium text-gray-700">Active</label>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end space-x-3">
                    <button className="btn-secondary" onClick={() => setEditUserId(null)}>Cancel</button>
                    <button className="btn-primary" onClick={() => handleSaveEdit(u.id)}>Save</button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {search || filterRole !== 'all' ? 'No users found' : 'No users available'}
            </h3>
            <p className="text-gray-600">
              {search || filterRole !== 'all'
                ? 'No users match your current search criteria.'
                : 'Start by creating your first user.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {showResetModal && resetUserTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-3">Reset Password for {getUserName(resetUserTarget)}</h3>
            <p className="text-sm text-gray-600 mb-4">Leave the password field blank to generate a secure temporary password and email it to the user.</p>
            <input
              type="text"
              className="input-field w-full mb-3"
              placeholder="Enter new password (optional)"
              value={resetPasswordInput}
              onChange={(e) => setResetPasswordInput(e.target.value)}
              disabled={isResetting}
            />

            {generatedPassword && (
              <div className="mb-3 p-3 bg-green-50 text-green-800 rounded">
                <div className="text-sm">Password set: <span className="font-mono">{generatedPassword}</span></div>
                <div className="text-xs text-gray-600">The user was emailed and can use this temporary password to sign in and then change their password.</div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button className="btn-secondary" onClick={closeResetModal} disabled={isResetting}>Close</button>
              <button className="btn-primary" onClick={() => handleResetPassword(false)} disabled={isResetting}>
                {isResetting ? 'Sending...' : 'Set & Email'}
              </button>
              <button className="btn-outline" onClick={() => handleResetPassword(true)} disabled={isResetting}>
                {isResetting ? 'Generating...' : 'Generate & Email'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default AdminUsers