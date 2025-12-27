// Utility helpers to extract names robustly from various API shapes
export const getDoctorName = (item) => {
  if (!item) return 'Unknown Doctor';

  // Potential doctor locations across payload shapes
  const doctor = item?.labRequest?.doctor || item?.doctor || item?.requestedBy || item?.request?.doctor || item?.doctorName || item?.doctor_name || item?.doctor_info || item?.creator || null;

  if (!doctor) return 'Unknown Doctor';
  if (typeof doctor === 'string') return doctor;
  if (doctor.username) return doctor.username;
  if (doctor.full_name) return doctor.full_name;
  if (doctor.fullName) return doctor.fullName;
  if (doctor.name) return doctor.name;
  if (doctor.first_name || doctor.last_name) return `${doctor.first_name || doctor.firstName || ''} ${doctor.last_name || doctor.lastName || ''}`.trim();
  if (doctor.id) return `Dr. ${doctor.id}`;
  return String(doctor);
};

export const getTechnicianName = (item) => {
  const t = item?.technician || item?.labRequest?.technician || item?.labRequest?.lab_technician || item?.technician_user || item?.technician_name || null;
  if (!t) return 'Unknown';
  if (typeof t === 'string') return t;
  if (t.name) return t.name;
  if (t.username) return t.username;
  if (t.first_name || t.last_name) return `${t.first_name || t.firstName || ''} ${t.last_name || t.lastName || ''}`.trim();
  if (t.id) return `Technician ${t.id}`;
  return String(t);
};

export const getPatientName = (item) => {
  if (!item) return 'Unassigned Patient';

  // Potential patient locations across payload shapes
  // Check common camelCase and snake_case keys and nested patient objects
  const patient = item.patient || item.labRequest?.patient || item.patient_info || item.patient_name || item.patientName || item.patient || null;
  // If a whole object was passed with patientName property (e.g., billing records), use it directly
  const directName = item.patientName || item.patient_name || null;
  const source = directName || patient || item || null;
  if (!source) return 'Unassigned Patient';

  if (typeof source === 'string') return source;
  if (source.name) return source.name;
  if (source.username) return source.username;
  if (source.full_name) return source.full_name;
  if (source.first_name || source.last_name) return `${source.first_name || source.firstName || ''} ${source.last_name || source.lastName || ''}`.trim();
  if (source.id) return `Patient ${source.id}`;
  return String(source);
};
