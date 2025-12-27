const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

// Use camelCase attribute names and map them to the existing snake_case DB columns
const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  patientId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'patient_id',
    references: { model: User, key: 'id' }
  },
  doctorId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'doctor_id',
    references: { model: User, key: 'id' }
  },
  appointmentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'appointment_date'
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'start_time'
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'end_time'
  },
  durationMinutes: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 30,
    field: 'duration_minutes'
  },
  visitType: {
    type: DataTypes.ENUM('consultation', 'follow_up', 'emergency', 'routine_checkup', 'procedure'),
    allowNull: false,
    field: 'visit_type'
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'confirmed', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show'),
    defaultValue: 'scheduled'
  },
  roomNumber: {
    type: DataTypes.STRING(20),
    field: 'room_number'
  },
  notes: {
    type: DataTypes.TEXT
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  treatment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  followUpRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'follow_up_required'
  },
  followUpDate: {
    type: DataTypes.DATEONLY,
    field: 'follow_up_date'
  },
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at'
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    field: 'cancellation_reason'
  },
  cancelledAt: {
    type: DataTypes.DATE,
    field: 'cancelled_at'
  },
  createdBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    field: 'created_by'
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at'
  }
}, {
  tableName: 'appointment',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['patient_id', 'appointment_date'] },
    { fields: ['doctor_id', 'appointment_date'] },
    { fields: ['status'] },
    { fields: ['visit_type'] },
    { fields: ['room_number'] },
    { fields: ['appointment_date', 'start_time'] }
  ]
});

// Define associations using the camelCase attribute names
Appointment.belongsTo(User, { foreignKey: 'patientId', as: 'patient' });
Appointment.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
Appointment.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = Appointment;
