
const User = require('./user');
const LabRequest = require('./labRequest');
const LabResult = require('./labResult');
const Appointment = require('./appointment');
const MedicalRecord = require('./medicalRecord');
const Prescription = require('./prescription');
const Billing = require('./billing');

const setupAssociations = () => {
  // Lab Request associations
  LabRequest.hasMany(LabResult, { foreignKey: 'labRequestId', as: 'labResults' });
  LabRequest.belongsTo(User, { foreignKey: 'patientId', as: 'patient' });
  LabRequest.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
  LabRequest.belongsTo(User, { foreignKey: 'technicianId', as: 'technician' });

  // Lab Result associations
  LabResult.belongsTo(LabRequest, { foreignKey: 'labRequestId', as: 'labRequest' });
  LabResult.belongsTo(User, { foreignKey: 'patientId', as: 'patient' });
  LabResult.belongsTo(User, { foreignKey: 'technicianId', as: 'technician' });
  LabResult.belongsTo(User, { foreignKey: 'releasedByDoctorId', as: 'releasedByDoctor' });

  // User associations (reverse relationships)
  User.hasMany(LabRequest, { foreignKey: 'patientId', as: 'patientLabRequests' });
  User.hasMany(LabRequest, { foreignKey: 'doctorId', as: 'doctorLabRequests' });
  User.hasMany(LabRequest, { foreignKey: 'technicianId', as: 'technicianLabRequests' });
  
  User.hasMany(LabResult, { foreignKey: 'patientId', as: 'patientLabResults' });
  User.hasMany(LabResult, { foreignKey: 'technicianId', as: 'technicianLabResults' });
  User.hasMany(LabResult, { foreignKey: 'releasedByDoctorId', as: 'releasedLabResults' });
};

module.exports = { setupAssociations };
