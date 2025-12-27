const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

const LabTechnician = sequelize.define('LabTechnician', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    references: {
      model: User,
      key: 'id',
    }
  },
  technician_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  specialization: { 
    type: DataTypes.STRING(100)
  },
  license_number: { 
    type: DataTypes.STRING(50),
    unique: true
  },
  years_of_experience: { 
    type: DataTypes.INTEGER.UNSIGNED 
  },
  certifications: { 
    type: DataTypes.TEXT 
  },
  is_available: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true 
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
  tableName: 'lab_technician',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['specialization'] },
    { fields: ['license_number'] },
    { fields: ['is_available'] }
  ]
});

LabTechnician.belongsTo(User, { foreignKey: 'id', as: 'user' });
User.hasOne(LabTechnician, { foreignKey: 'id', as: 'labTechnician' });

module.exports = LabTechnician;
