import React, { useState, useEffect, useRef } from 'react';
import { Search, User, ChevronDown } from 'lucide-react';
import { searchPatients, getPatientSummary } from '../../services/doctorService';

const PatientSearchDropdown = ({ 
  value, 
  onChange, 
  placeholder = "Search and select patient...",
  required = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchPatients = async () => {
      if (searchTerm.length < 2) {
        setPatients([]);
        return;
      }

      try {
        setIsLoading(true);
        const data = await searchPatients(searchTerm);
        setPatients(data || []);
      } catch (error) {
        console.error('Error searching patients:', error);
        setPatients([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchPatients, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  useEffect(() => {
    let mounted = true;

    const loadPatientById = async (id) => {
      try {
        const parsed = parseInt(id);
        const idToUse = !isNaN(parsed) ? parsed : id;
        const data = await getPatientSummary(idToUse);
        // getPatientSummary may return an object or wrapped response
        const patient = Array.isArray(data) ? data[0] : data;
        if (mounted) setSelectedPatient(patient || null);
      } catch (err) {
        console.error('Error fetching patient by id:', err);
        if (mounted) setSelectedPatient(null);
      }
    };

    if (value) {
      // Try to find in currently loaded patients first
      const patient = patients.find(p => String(p.id) === String(value) || String(p.patientId) === String(value));
      if (patient) {
        setSelectedPatient(patient);
      } else {
        // Fallback: fetch single patient by id from backend
        loadPatientById(value);
      }
    } else {
      setSelectedPatient(null);
    }

    return () => { mounted = false; };
  }, [value, patients]);

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
   
    const patientId = patient.patientId || patient.id;
    onChange(patientId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputClick = () => {
    setIsOpen(true);
  };

  const displayValue = selectedPatient 
    ? `${selectedPatient.patientId || `PAT${String(selectedPatient.id).padStart(6, '0')}`} - ${selectedPatient.username || selectedPatient.name || `${selectedPatient.first_name || ''} ${selectedPatient.last_name || ''}`.trim()}`
    : '';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={isOpen ? searchTerm : displayValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setSearchTerm(newValue);
            if (!isOpen) setIsOpen(true);
           
            if (selectedPatient && newValue !== displayValue) {
              setSelectedPatient(null);
              onChange('');
            }
          }}
          onClick={handleInputClick}
          className="input-field pr-10"
          placeholder={placeholder}
          required={required}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
          ) : (
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {searchTerm.length < 2 && patients.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Type at least 2 characters to search patients
            </div>
          ) : patients.length > 0 ? (
            patients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => handlePatientSelect(patient)}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {patient.username || patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim()}
                      </span>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {patient.patientId || `PAT${String(patient.id).padStart(6, '0')}`}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {patient.email || ''}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : searchTerm.length >= 2 && !isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No patients found matching "{searchTerm}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default PatientSearchDropdown;
