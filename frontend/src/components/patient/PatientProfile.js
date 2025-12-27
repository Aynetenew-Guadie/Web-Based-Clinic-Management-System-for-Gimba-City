import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Edit, Save, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getPatientProfile, updatePatientProfile } from '../../services/patientService';
import { toast } from 'react-hot-toast';

const PatientProfile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    first_name: '',
    last_name: '',
    username: '',
    patientId: '',
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    bloodType: 'O+',
    allergies: 'None',
    medicalHistory: 'No significant medical history'
  });


  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      let profileData;
      
      try {
        // Try to fetch real data first
        profileData = await getPatientProfile();
      } catch (error) {
        console.error('Failed to fetch profile from backend:', error);
        toast.error('Failed to load profile data from server');
        // Use minimal user info if available, otherwise keep defaults
        profileData = {
          name: user?.username || '',
          email: user?.email || '',
          first_name: user?.username?.split(' ')?.[0] || '',
          last_name: user?.username?.split(' ')?.slice(1).join(' ') || '',
          username: user?.username || '',
          patientId: user?.id ? `PAT-${user.id}` : ''
        };
      }

      // Ensure we have data and set defaults for missing fields
      setProfile({
        name: profileData.name || `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'Patient Name',
        email: profileData.email || user?.email || '',
        phone: profileData.phone || profileData.phone_number || '',
        first_name: profileData.first_name || profileData.name?.split(' ')[0] || '',
        last_name: profileData.last_name || profileData.name?.split(' ').slice(1).join(' ') || '',
        username: profileData.username || user?.username || '',
        patientId: profileData.patientId || profileData.id || `PAT-${user?.id || '001'}`,
        dateOfBirth: profileData.dateOfBirth || profileData.dob || profileData.date_of_birth || '1990-01-01',
        address: profileData.address || profileData.location || '',
        emergencyContact: profileData.emergencyContact || profileData.emergency_contact || 'Emergency Contact',
        emergencyPhone: profileData.emergencyPhone || profileData.emergency_phone || '+1234567890',
        bloodType: profileData.bloodType || profileData.blood_type || 'O+',
        allergies: profileData.allergies || 'None reported',
        medicalHistory: profileData.medicalHistory || profileData.medical_history || 'No significant medical history'
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const updateData = {
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        // Include other fields that might be updatable
        address: profile.address,
        dateOfBirth: profile.dateOfBirth,
        emergencyContact: profile.emergencyContact,
        emergencyPhone: profile.emergencyPhone,
        bloodType: profile.bloodType,
        allergies: profile.allergies,
        medicalHistory: profile.medicalHistory
      };
      
      let response;
        try {
          // Try to update via API
          response = await updatePatientProfile(updateData);
          toast.success('Profile updated successfully!');

          // Normalize potential response shapes and update auth context
          const userCandidate = response?.user || response?.data || response;
          if (userCandidate && (userCandidate.id || userCandidate.email || userCandidate.username || userCandidate.name)) {
            updateUser(userCandidate);
          } else {
            // As a last resort, merge profile fields into existing user object
            updateUser({
              ...user,
              first_name: updateData.first_name,
              last_name: updateData.last_name,
              email: updateData.email,
              phone: updateData.phone
            });
          }
        } catch (error) {
          console.error('Failed to update profile:', error);
          toast.error('Failed to update profile. Please try again.');
        }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    fetchProfile(); // Reset to original data
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for name fields to update the full name
    if (name === 'first_name' || name === 'last_name') {
      const firstName = name === 'first_name' ? value : profile.first_name;
      const lastName = name === 'last_name' ? value : profile.last_name;
      
      setProfile(prev => ({
        ...prev,
        [name]: value,
        name: `${firstName} ${lastName}`.trim()
      }));
    } else {
      setProfile(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Profile</h1>
          <p className="text-gray-600">Manage your personal and medical information</p>
        </div>
        <div className="flex space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="first_name"
                    value={profile.first_name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="input-field pl-10 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    placeholder="First name"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={profile.last_name}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="input-field disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                value={profile.name}
                disabled
                className="input-field bg-gray-50 cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="form-label">Username</label>
              <input
                type="text"
                name="username"
                value={profile.username}
                disabled
                className="input-field bg-gray-50 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="form-label">Patient ID</label>
              <input
                type="text"
                name="patientId"
                value={profile.patientId}
                disabled
                className="input-field bg-gray-50 cursor-not-allowed font-mono"
              />
            </div>

            <div>
              <label className="form-label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="input-field pl-10 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="input-field pl-10 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Date of Birth</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  name="dateOfBirth"
                  value={profile.dateOfBirth}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="input-field pl-10 disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  name="address"
                  value={profile.address}
                  onChange={handleChange}
                  disabled={!isEditing}
                  rows={3}
                  className="input-field pl-10 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Enter your full address..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h2>
          <div className="space-y-4">
            <div>
              <label className="form-label">Blood Type</label>
              <select
                name="bloodType"
                value={profile.bloodType}
                onChange={handleChange}
                disabled={!isEditing}
                className="input-field disabled:bg-gray-50 disabled:cursor-not-allowed"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="form-label">Allergies</label>
              <textarea
                name="allergies"
                value={profile.allergies}
                onChange={handleChange}
                disabled={!isEditing}
                rows={3}
                className="input-field disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="List any known allergies..."
              />
            </div>

            <div>
              <label className="form-label">Medical History</label>
              <textarea
                name="medicalHistory"
                value={profile.medicalHistory}
                onChange={handleChange}
                disabled={!isEditing}
                rows={4}
                className="input-field disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="Describe your medical history..."
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h2>
          <div className="space-y-4">
            <div>
              <label className="form-label">Emergency Contact Name</label>
              <input
                type="text"
                name="emergencyContact"
                value={profile.emergencyContact}
                onChange={handleChange}
                disabled={!isEditing}
                className="input-field disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="Full name of emergency contact"
              />
            </div>

            <div>
              <label className="form-label">Emergency Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  name="emergencyPhone"
                  value={profile.emergencyPhone}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="input-field pl-10 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Profile Summary */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Patient ID:</span>
              <span className="font-medium font-mono text-primary-600">{profile.patientId}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Username:</span>
              <span className="font-medium">{profile.username}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Account Status:</span>
              <span className="font-medium text-green-600">Active</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Role:</span>
              <span className="font-medium capitalize bg-primary-100 text-primary-800 px-2 py-1 rounded-full text-sm">
                {user?.role || 'Patient'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Member Since:</span>
              <span className="font-medium">{new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Demo notice removed - data should come from backend */}
    </div>
  );
};

// Helper component for the info icon
const InformationCircleIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);

export default PatientProfile;