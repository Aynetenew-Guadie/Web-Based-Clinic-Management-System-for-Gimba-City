import React, { useState, useEffect } from 'react';
import { FileText, User, Calendar, Plus, Loader, Search, Filter, Eye, Edit, X, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/apiService';
import { searchPatients, createMedicalNote } from '../../services/doctorService';
import toast from 'react-hot-toast';

const DoctorMedicalNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newNote, setNewNote] = useState({
    patientId: '',
    noteType: '',
    summary: '',
    details: ''
  });
  const [patients, setPatients] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // No inline mock data — use backend APIs for notes and patients

  // Function to get medical notes using available methods
  const fetchMedicalNotes = async () => {
    try {
      setIsLoading(true);
      // Try direct API call first
      const response = await api.get('/doctor/medical-notes');
      setNotes(response.data || []);
    } catch (error) {
      console.error('Error fetching medical notes:', error);
      // Backend not available — set empty list and notify
      setNotes([]);
      toast.error('Failed to load medical notes from backend');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update medical note using available methods
  const updateMedicalNote = async (id, noteData) => {
    try {
      const response = await api.put(`/doctor/medical-notes/${id}`, noteData);
      return response.data;
    } catch (error) {
      console.error('Error updating medical note:', error);
      throw error;
    }
  };

  const fetchPatients = async () => {
    try {
      const patientsData = await searchPatients('');
      setPatients(patientsData || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      // Backend not available — set empty list
      setPatients([]);
      toast.error('Failed to load patients for medical notes');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        await Promise.all([fetchMedicalNotes(), fetchPatients()]);
      }
    };

    fetchData();
  }, [user]);

  const filteredNotes = notes.filter(note => {
    const patientName = note.patient?.username || 
                       (note.patient?.first_name && note.patient?.last_name 
                         ? `${note.patient.first_name} ${note.patient.last_name}`
                         : 'Unknown Patient');
    
    const matchesSearch = patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || note.noteType === filterType;
    return matchesSearch && matchesType;
  });

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.patientId || !newNote.noteType || !newNote.summary) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const noteData = {
        patientId: parseInt(newNote.patientId),
        noteType: newNote.noteType,
        summary: newNote.summary,
        details: newNote.details,
        diagnosis: newNote.summary, // Using summary as diagnosis for now
        clinical_notes: newNote.details
      };

      // Use the available createMedicalNote function from doctorService
      const response = await createMedicalNote(noteData);
      
      // Add the new note to the state
      const addedNote = {
        ...response,
        id: response.id || Date.now(),
        patient: patients.find(p => p.id === parseInt(newNote.patientId)),
        createdAt: new Date().toISOString()
      };
      
      setNotes([addedNote, ...notes]);
      setNewNote({ patientId: '', noteType: '', summary: '', details: '' });
      setShowAddForm(false);
      toast.success('Medical note added successfully');
    } catch (error) {
      console.error('Error adding medical note:', error);
      toast.error('Failed to add medical note');
      setNewNote({ patientId: '', noteType: '', summary: '', details: '' });
      setShowAddForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewNoteDetails = (note) => {
    setSelectedNote(note);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setSelectedNote(null);
    setShowDetailModal(false);
  };

  const startEditNote = (note) => {
    setEditingNote({
      ...note,
      summary: note.diagnosis || note.summary || '',
      details: note.clinical_notes || note.details || ''
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setEditingNote(null);
    setShowEditModal(false);
  };

  const handleUpdateNote = async (e) => {
    e.preventDefault();
    if (!editingNote.summary) {
      toast.error('Please fill in the summary field');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData = {
        diagnosis: editingNote.summary,
        clinical_notes: editingNote.details,
        summary: editingNote.summary,
        details: editingNote.details
      };

      // Use the local updateMedicalNote function
      const response = await updateMedicalNote(editingNote.id, updateData);
      
      setNotes(notes.map(note => 
        note.id === editingNote.id 
          ? { 
              ...note, 
              ...updateData,
              diagnosis: editingNote.summary, 
              clinical_notes: editingNote.details,
              summary: editingNote.summary,
              details: editingNote.details
            }
          : note
      ));
      
      closeEditModal();
      toast.success('Medical note updated successfully');
    } catch (error) {
      console.error('Error updating medical note:', error);
      toast.error('Failed to update medical note');
      closeEditModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNoteTypeColor = (type) => {
    switch (type) {
      case 'general_checkup':
        return 'bg-blue-100 text-blue-800';
      case 'consultation':
        return 'bg-green-100 text-green-800';
      case 'follow_up':
        return 'bg-purple-100 text-purple-800';
      case 'emergency':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNoteTypeText = (type) => {
    switch (type) {
      case 'general_checkup':
        return 'General Checkup';
      case 'consultation':
        return 'Consultation';
      case 'follow_up':
        return 'Follow-up';
      case 'emergency':
        return 'Emergency';
      default:
        return type?.replace('_', ' ').charAt(0).toUpperCase() + 
               type?.replace('_', ' ').slice(1) || 'Note';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Medical Notes</h1>
          <p className="text-gray-600">View and manage patient medical notes</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary flex items-center space-x-2"
          disabled={isSubmitting}
        >
          <Plus className="h-4 w-4" />
          <span>{showAddForm ? 'Cancel' : 'Add Note'}</span>
        </button>
      </div>

      {/* Add Note Form */}
      {showAddForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Medical Note</h3>
          <form onSubmit={handleAddNote} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient *
                </label>
                <select
                  value={newNote.patientId}
                  onChange={(e) => setNewNote({...newNote, patientId: e.target.value})}
                  className="input-field"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select a patient</option>
                  {patients.map(patient => {
                    const name = patient ? ((patient.first_name || patient.last_name) ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() : null) : null;
                    const label = patient ? (patient.username || name || patient.email || `ID:${patient.patientId || patient.id}`) : 'Unknown';
                    return (
                      <option key={patient.id} value={patient.id}>{label}</option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note Type *
                </label>
                <select
                  value={newNote.noteType}
                  onChange={(e) => setNewNote({...newNote, noteType: e.target.value})}
                  className="input-field"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select type</option>
                  <option value="general_checkup">General Checkup</option>
                  <option value="consultation">Consultation</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Summary/Diagnosis *
              </label>
              <input
                type="text"
                value={newNote.summary}
                onChange={(e) => setNewNote({...newNote, summary: e.target.value})}
                className="input-field"
                placeholder="Brief summary or diagnosis"
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clinical Notes
              </label>
              <textarea
                value={newNote.details}
                onChange={(e) => setNewNote({...newNote, details: e.target.value})}
                className="input-field"
                rows={4}
                placeholder="Detailed clinical notes..."
                disabled={isSubmitting}
              />
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
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>{isSubmitting ? 'Adding...' : 'Add Note'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes by patient or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input-field"
          >
            <option value="all">All Types</option>
            <option value="general_checkup">General Checkup</option>
            <option value="consultation">Consultation</option>
            <option value="follow_up">Follow-up</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((note) => (
            <div key={note.id} className="card">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {note.patient?.username || 
                       (note.patient?.first_name && note.patient?.last_name 
                         ? `${note.patient.first_name} ${note.patient.last_name}`
                         : 'Unknown Patient')}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getNoteTypeColor(note.noteType)}`}>
                      {getNoteTypeText(note.noteType)}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(note.createdAt || note.date)}</span>
                    </div>
                    <p className="text-gray-700">{note.summary || note.diagnosis}</p>
                    {(note.details || note.clinical_notes) && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {note.details || note.clinical_notes}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <button 
                    onClick={() => startEditNote(note)}
                    className="btn-secondary text-sm px-3 py-1 flex items-center space-x-1"
                    disabled={isSubmitting}
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button 
                    onClick={() => viewNoteDetails(note)}
                    className="btn-primary text-sm px-3 py-1 flex items-center space-x-1"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterType !== 'all' ? 'No notes found' : 'No medical notes available'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterType !== 'all'
                ? 'No notes match your current search criteria.'
                : 'Start by adding your first medical note for a patient.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Note Detail Modal */}
      {showDetailModal && selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Medical Note Details
                </h2>
                <button 
                  onClick={closeDetailModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Note Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-600 font-medium">Patient: </span>
                        <span className="text-gray-800">
                          {selectedNote.patient?.username || 
                           (selectedNote.patient?.first_name && selectedNote.patient?.last_name 
                             ? `${selectedNote.patient.first_name} ${selectedNote.patient.last_name}`
                             : 'Unknown Patient')}
                        </span>
                      </div>
                      {selectedNote.patient?.id && (
                        <div>
                          <span className="text-gray-600 font-medium">Patient ID: </span>
                          <span className="text-gray-800 font-mono">{selectedNote.patient.id}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600 font-medium">Date: </span>
                        <span className="text-gray-800">
                          {formatDate(selectedNote.createdAt || selectedNote.date)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Type: </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getNoteTypeColor(selectedNote.noteType)}`}>
                          {getNoteTypeText(selectedNote.noteType)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {(selectedNote.diagnosis || selectedNote.summary) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Diagnosis/Summary</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedNote.diagnosis || selectedNote.summary}</p>
                  </div>
                )}
                
                {(selectedNote.clinical_notes || selectedNote.details) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Clinical Notes</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                      {selectedNote.clinical_notes || selectedNote.details}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button 
                  onClick={() => {
                    closeDetailModal();
                    startEditNote(selectedNote);
                  }}
                  className="btn-secondary flex items-center space-x-2"
                  disabled={isSubmitting}
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Note</span>
                </button>
                <button 
                  onClick={closeDetailModal}
                  className="btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {showEditModal && editingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Edit Medical Note
                </h2>
                <button 
                  onClick={closeEditModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleUpdateNote} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient
                  </label>
                  <input
                    type="text"
                    value={editingNote.patient?.username || 
                           (editingNote.patient?.first_name && editingNote.patient?.last_name 
                             ? `${editingNote.patient.first_name} ${editingNote.patient.last_name}`
                             : 'Unknown Patient')}
                    className="input-field bg-gray-100"
                    disabled
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Summary/Diagnosis *
                  </label>
                  <input
                    type="text"
                    value={editingNote.summary}
                    onChange={(e) => setEditingNote({...editingNote, summary: e.target.value})}
                    className="input-field"
                    placeholder="Brief summary or diagnosis"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clinical Notes
                  </label>
                  <textarea
                    value={editingNote.details}
                    onChange={(e) => setEditingNote({...editingNote, details: e.target.value})}
                    className="input-field"
                    rows={6}
                    placeholder="Detailed clinical notes..."
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={closeEditModal}
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
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorMedicalNotes;