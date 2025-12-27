const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

const Doctor = sequelize.define('Doctor', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    references: {
      model: User,
      key: 'id',
    }
  },
  doctor_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  specialization: { 
    type: DataTypes.STRING(100), 
    allowNull: false 
  },
  license_number: { 
    type: DataTypes.STRING(50), 
    allowNull: false, 
    unique: true 
  },
  years_of_experience: { 
    type: DataTypes.INTEGER.UNSIGNED 
  },
  education: { 
    type: DataTypes.TEXT 
  },
  certifications: { 
    type: DataTypes.TEXT 
  },
  languages_spoken: { 
    type: DataTypes.JSON 
  },
  consultation_fee: { 
    type: DataTypes.DECIMAL(10, 2) 
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
  tableName: 'doctor',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['specialization'] },
    { fields: ['license_number'] },
    { fields: ['is_available'] }
  ]
});

Doctor.belongsTo(User, { foreignKey: 'id', as: 'user' });
User.hasOne(Doctor, { foreignKey: 'id', as: 'doctor' });

module.exports = Doctor;
