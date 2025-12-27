
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LabRequest = sequelize.define('LabRequest', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  patientId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  doctorId: { type: DataTypes.INTEGER.UNSIGNED },
  technicianId: { type: DataTypes.INTEGER.UNSIGNED },
  testType: { type: DataTypes.STRING, allowNull: false },
  urgency: { type: DataTypes.ENUM('low', 'normal', 'high'), defaultValue: 'normal' },
  status: { 
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  dateRequested: { type: DataTypes.DATE, allowNull: false },
  acceptedAt: { type: DataTypes.DATE },
  completedAt: { type: DataTypes.DATE },
  notes: { type: DataTypes.TEXT },
}, {
  timestamps: true,
  tableName: 'LabRequest',
  freezeTableName: true,
});

module.exports = LabRequest;
