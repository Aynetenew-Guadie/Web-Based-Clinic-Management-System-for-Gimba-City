// Utility helpers to extract names robustly from various API shapes
export const getDoctorName = (item) => {
  if (!item) return 'Unknown Doctor';

  // Potential doctor locations across payload shapes.
  // Also accept the top-level `item` as the doctor object (some endpoints return the doctor directly)
  let doctor = item?.labRequest?.doctor || item?.doctor || item?.requestedBy || item?.request?.doctor || item?.doctorName || item?.doctor_name || item?.doctor_info || item?.creator || item || null;

  if (!doctor) return 'Unknown Doctor';

  // Unwrap common container shapes
  if (doctor.data) doctor = doctor.data;

  if (typeof doctor === 'string') return doctor;

  // Common name-like keys to check in order of preference
  const candidateKeys = ['name', 'display_name', 'displayName', 'full_name', 'fullName', 'username', 'title', 'doctor_name', 'label'];
  for (const k of candidateKeys) {
    if (doctor[k]) return doctor[k];
  }

  // First / Last name combos
  const first = doctor.first_name || doctor.firstName || doctor.givenName || doctor.given_name;
  const last = doctor.last_name || doctor.lastName || doctor.familyName || doctor.family_name;
  if (first || last) return `${first || ''} ${last || ''}`.trim();

  // Specialization sometimes contains a nested name
  if (doctor.specialization && typeof doctor.specialization === 'object' && doctor.specialization.name) return doctor.specialization.name;
  if (doctor.specialization && typeof doctor.specialization === 'string') return doctor.specialization;

  if (doctor.id) return `Dr. ${doctor.id}`;

  try {
    const s = String(doctor);
    if (s && s !== '[object Object]') return s;
  } catch (e) {}

  return 'Unknown Doctor';
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
