import React, { useState, useEffect } from 'react'
import { Settings, Save, Loader, Bell, Globe, Building, Shield, Database, Mail, Phone, MapPin } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/apiService'
import toast from 'react-hot-toast'

const AdminSettings = () => {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState({
    clinicName: '',
    clinicAddress: '',
    clinicPhone: '',
    clinicEmail: '',
    clinicWebsite: '',
    
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    language: 'en',
    
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    billingReminders: true,
    
    sessionTimeout: 30,
    passwordPolicy: 'medium',
    twoFactorAuth: false,
    
    backupFrequency: 'daily',
    backupRetention: 30,
    autoBackup: true
  })

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true)
        const response = await api.get('/admin/settings')
        if (response.data) {
          setSettings(prevSettings => ({ ...prevSettings, ...response.data }))
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
        toast('Using default settings')
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchSettings()
    }
  }, [user])

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true)
      await api.put('/admin/settings', settings)
      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      setSettings({
        clinicName: 'City Clinic',
        clinicAddress: '',
        clinicPhone: '',
        clinicEmail: '',
        clinicWebsite: '',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        language: 'en',
        emailNotifications: true,
        smsNotifications: false,
        appointmentReminders: true,
        billingReminders: true,
        sessionTimeout: 30,
        passwordPolicy: 'medium',
        twoFactorAuth: false,
        backupFrequency: 'daily',
        backupRetention: 30,
        autoBackup: true
      })
      toast.success('Settings reset to default values')
    }
  }

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
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
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure global application preferences</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleResetSettings}
            className="btn-secondary"
          >
            Reset to Default
          </button>
          <button 
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="btn-primary flex items-center space-x-2"
          >
            {isSaving ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Clinic Information */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Building className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Clinic Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinic Name *
            </label>
            <input 
              className="input-field" 
              value={settings.clinicName} 
              onChange={e => updateSetting('clinicName', e.target.value)}
              placeholder="Enter clinic name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinic Email
            </label>
            <input 
              className="input-field" 
              type="email"
              value={settings.clinicEmail} 
              onChange={e => updateSetting('clinicEmail', e.target.value)}
              placeholder="clinic@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinic Phone
            </label>
            <input 
              className="input-field" 
              type="tel"
              value={settings.clinicPhone} 
              onChange={e => updateSetting('clinicPhone', e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinic Website
            </label>
            <input 
              className="input-field" 
              type="url"
              value={settings.clinicWebsite} 
              onChange={e => updateSetting('clinicWebsite', e.target.value)}
              placeholder="https://clinic.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinic Address
            </label>
            <textarea 
              className="input-field" 
              rows={2}
              value={settings.clinicAddress} 
              onChange={e => updateSetting('clinicAddress', e.target.value)}
              placeholder="Enter full clinic address"
            />
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">System Settings</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select 
              className="input-field" 
              value={settings.timezone} 
              onChange={e => updateSetting('timezone', e.target.value)}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Format
            </label>
            <select 
              className="input-field" 
              value={settings.dateFormat} 
              onChange={e => updateSetting('dateFormat', e.target.value)}
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Format
            </label>
            <select 
              className="input-field" 
              value={settings.timeFormat} 
              onChange={e => updateSetting('timeFormat', e.target.value)}
            >
              <option value="12h">12-hour</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select 
              className="input-field" 
              value={settings.language} 
              onChange={e => updateSetting('language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Timeout (minutes)
            </label>
            <input 
              className="input-field" 
              type="number"
              min="5"
              max="480"
              value={settings.sessionTimeout} 
              onChange={e => updateSetting('sessionTimeout', parseInt(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password Policy
            </label>
            <select 
              className="input-field" 
              value={settings.passwordPolicy} 
              onChange={e => updateSetting('passwordPolicy', e.target.value)}
            >
              <option value="low">Low (6+ characters)</option>
              <option value="medium">Medium (8+ characters, mixed case)</option>
              <option value="high">High (10+ characters, symbols, numbers)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Bell className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input 
                id="emailNotif" 
                type="checkbox" 
                checked={settings.emailNotifications} 
                onChange={e => updateSetting('emailNotifications', e.target.checked)} 
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" 
              />
              <label htmlFor="emailNotif" className="text-sm text-gray-700">Enable email notifications</label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                id="smsNotif" 
                type="checkbox" 
                checked={settings.smsNotifications} 
                onChange={e => updateSetting('smsNotifications', e.target.checked)} 
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" 
              />
              <label htmlFor="smsNotif" className="text-sm text-gray-700">Enable SMS notifications</label>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input 
                id="appointmentReminders" 
                type="checkbox" 
                checked={settings.appointmentReminders} 
                onChange={e => updateSetting('appointmentReminders', e.target.checked)} 
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" 
              />
              <label htmlFor="appointmentReminders" className="text-sm text-gray-700">Appointment reminders</label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                id="billingReminders" 
                type="checkbox" 
                checked={settings.billingReminders} 
                onChange={e => updateSetting('billingReminders', e.target.checked)} 
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" 
              />
              <label htmlFor="billingReminders" className="text-sm text-gray-700">Billing reminders</label>
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input 
              id="twoFactorAuth" 
              type="checkbox" 
              checked={settings.twoFactorAuth} 
              onChange={e => updateSetting('twoFactorAuth', e.target.checked)} 
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" 
            />
            <label htmlFor="twoFactorAuth" className="text-sm text-gray-700">Enable two-factor authentication</label>
          </div>
        </div>
      </div>

      {/* Database Settings */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Database className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Database Settings</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Backup Frequency
            </label>
            <select 
              className="input-field" 
              value={settings.backupFrequency} 
              onChange={e => updateSetting('backupFrequency', e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Backup Retention (days)
            </label>
            <input 
              className="input-field" 
              type="number"
              min="1"
              max="365"
              value={settings.backupRetention} 
              onChange={e => updateSetting('backupRetention', parseInt(e.target.value))}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input 
              id="autoBackup" 
              type="checkbox" 
              checked={settings.autoBackup} 
              onChange={e => updateSetting('autoBackup', e.target.checked)} 
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" 
            />
            <label htmlFor="autoBackup" className="text-sm text-gray-700">Automatic backups</label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminSettings

