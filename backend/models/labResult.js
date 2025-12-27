const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LabResult = sequelize.define('LabResult', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  labRequestId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  patientId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  technicianId: { type: DataTypes.INTEGER.UNSIGNED },
  resultDetails: { type: DataTypes.TEXT, allowNull: false },
  reportUrl: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT },
  date: { type: DataTypes.DATE, allowNull: false },
  releasedToPatient: { type: DataTypes.BOOLEAN, defaultValue: false },
  releasedAt: { type: DataTypes.DATE },
  releasedByDoctorId: { type: DataTypes.INTEGER.UNSIGNED },
  sharedWithPatient: { type: DataTypes.BOOLEAN, defaultValue: false },
  sharedAt: { type: DataTypes.DATE },
}, {
  timestamps: true,
  tableName: 'LabResult',
  freezeTableName: true,
});

LabResult.associate = (models) => {
  LabResult.belongsTo(models.LabRequest, { foreignKey: 'labRequestId', as: 'labRequest' });
  LabResult.belongsTo(models.User, { foreignKey: 'patientId', as: 'patient' });
  LabResult.belongsTo(models.User, { foreignKey: 'technicianId', as: 'technician' });
  LabResult.belongsTo(models.User, { foreignKey: 'releasedByDoctorId', as: 'releasedByDoctor' });
};

module.exports = LabResult;
