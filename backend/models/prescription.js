const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');
const MedicalRecord = require('./medicalRecord');

const Prescription = sequelize.define('Prescription', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  patientId: { type: DataTypes.INTEGER.UNSIGNED, references: { model: User, key: 'id' }, allowNull: false },
  doctorId: { type: DataTypes.INTEGER.UNSIGNED, references: { model: User, key: 'id' } },
  medication: { type: DataTypes.STRING, allowNull: false },
  dosage: { type: DataTypes.STRING },
  frequency: { type: DataTypes.STRING },
  instructions: { type: DataTypes.TEXT },
  duration: { type: DataTypes.STRING },
  refills: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  status: { type: DataTypes.STRING, defaultValue: 'prescribed' },
  expiry_date: { type: DataTypes.DATE, allowNull: true },
  dispensed_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  date_dispensed: { type: DataTypes.DATE, allowNull: true },
  medicalRecordId: { type: DataTypes.INTEGER.UNSIGNED, references: { model: MedicalRecord, key: 'id' } },
  dateIssued: { type: DataTypes.DATE, allowNull: false },
}, {
  timestamps: true,
  tableName: 'prescription',
  freezeTableName: true,
  underscored: true
});

Prescription.belongsTo(User, { foreignKey: 'patientId', as: 'patient' });
Prescription.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
Prescription.belongsTo(User, { foreignKey: 'dispensed_by', as: 'dispenser' });
Prescription.belongsTo(MedicalRecord, { foreignKey: 'medicalRecordId', as: 'medicalRecord' });

module.exports = Prescription;
