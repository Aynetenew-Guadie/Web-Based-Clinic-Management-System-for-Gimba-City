const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

const LabRequest = sequelize.define('LabRequest', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  patientId: { type: DataTypes.INTEGER.UNSIGNED, references: { model: User, key: 'id' }, allowNull: false },
  doctorId: { type: DataTypes.INTEGER.UNSIGNED, references: { model: User, key: 'id' } },
  technicianId: { type: DataTypes.INTEGER.UNSIGNED, references: { model: User, key: 'id' } },
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

LabRequest.belongsTo(User, { foreignKey: 'patientId', as: 'patient' });
LabRequest.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
LabRequest.belongsTo(User, { foreignKey: 'technicianId', as: 'technician' });

LabRequest.associate = (models) => {
  if (models.LabResult) {
    LabRequest.hasMany(models.LabResult, { foreignKey: 'labRequestId', as: 'labResults' });
  }
};

module.exports = LabRequest;
