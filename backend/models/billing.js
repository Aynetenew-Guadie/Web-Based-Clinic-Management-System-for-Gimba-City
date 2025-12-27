const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

const Billing = sequelize.define('Billing', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  patientId: { type: DataTypes.INTEGER.UNSIGNED, references: { model: User, key: 'id' }, allowNull: false },
  doctorId: { type: DataTypes.INTEGER.UNSIGNED, references: { model: User, key: 'id' }, allowNull: true },
  appointmentId: { type: DataTypes.INTEGER, allowNull: true },
  
  // Separate billing components
  consultationFee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  diagnosisFee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  labTestFee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  
  // Legacy fields for backward compatibility
  serviceType: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  
  // Detailed descriptions for each component
  consultationDescription: { type: DataTypes.TEXT },
  diagnosisDescription: { type: DataTypes.TEXT },
  labTestDescription: { type: DataTypes.TEXT },
  
  paidAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  date: { type: DataTypes.DATE, allowNull: false },
  dueDate: { type: DataTypes.DATE },
  status: { 
    type: DataTypes.ENUM('pending', 'paid', 'partial', 'overdue'), 
    defaultValue: 'pending' 
  },
  paymentMethod: { type: DataTypes.STRING },
  paymentDate: { type: DataTypes.DATE },
  processedBy: { type: DataTypes.INTEGER.UNSIGNED, references: { model: User, key: 'id' }, allowNull: true },
  invoiceNumber: { type: DataTypes.STRING, unique: true },
  notes: { type: DataTypes.TEXT },
  relatedAppointmentId: { type: DataTypes.INTEGER },
  relatedMedicalRecordId: { type: DataTypes.INTEGER },
}, {
  timestamps: true,
  hooks: {
    beforeSave: (billing) => {
      // Auto-calculate total amount from components
      const consultation = parseFloat(billing.consultationFee) || 0;
      const diagnosis = parseFloat(billing.diagnosisFee) || 0;
      const labTest = parseFloat(billing.labTestFee) || 0;
      billing.amount = consultation + diagnosis + labTest;
    }
  }
});

Billing.belongsTo(User, { foreignKey: 'patientId', as: 'patient' });
Billing.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
Billing.belongsTo(User, { foreignKey: 'processedBy', as: 'processor' });

module.exports = Billing;
