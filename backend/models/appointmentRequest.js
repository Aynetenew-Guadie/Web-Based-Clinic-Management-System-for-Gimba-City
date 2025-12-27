const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

const AppointmentRequest = sequelize.define('AppointmentRequest', {
  id: { 
    type: DataTypes.INTEGER.UNSIGNED, 
    primaryKey: true, 
    autoIncrement: true 
  },
  patient_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    references: { model: User, key: 'id' }
  },
  preferred_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  preferred_time_slot: {
    type: DataTypes.ENUM('morning', 'afternoon', 'evening'),
    allowNull: false
  },
  visit_type: {
    type: DataTypes.ENUM('consultation', 'follow_up', 'emergency', 'routine_checkup', 'procedure'),
    allowNull: false
  },
  urgency: {
    type: DataTypes.ENUM('low', 'normal', 'high'),
    defaultValue: 'normal'
  },
  symptoms: {
    type: DataTypes.TEXT
  },
  preferred_doctor_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    references: { model: User, key: 'id' }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'scheduled'),
    defaultValue: 'pending'
  },
  notes: {
    type: DataTypes.TEXT
  },
  processed_by: {
    type: DataTypes.INTEGER.UNSIGNED,
    references: { model: User, key: 'id' }
  },
  processed_at: {
    type: DataTypes.DATE
  },
  appointment_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    references: { model: 'appointment', key: 'id' }
  }
}, {
  tableName: 'appointment_request',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['patient_id', 'status'] },
    { fields: ['preferred_date'] },
    { fields: ['status'] },
    { fields: ['preferred_doctor_id'] }
  ]
});

AppointmentRequest.belongsTo(User, { foreignKey: 'patient_id', as: 'patient' });
AppointmentRequest.belongsTo(User, { foreignKey: 'preferred_doctor_id', as: 'preferredDoctor' });
AppointmentRequest.belongsTo(User, { foreignKey: 'processed_by', as: 'receptionist' });
AppointmentRequest.belongsTo(require('./appointment'), { foreignKey: 'appointment_id', as: 'appointment' });

module.exports = AppointmentRequest;
