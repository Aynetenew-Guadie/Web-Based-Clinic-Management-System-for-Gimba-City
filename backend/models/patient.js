const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

const Patient = sequelize.define('Patient', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    references: {
      model: User,
      key: 'id',
    }
  },
  patient_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  date_of_birth: { 
    type: DataTypes.DATEONLY, 
    allowNull: false 
  },
  gender: { 
    type: DataTypes.ENUM('male', 'female', 'other', 'prefer_not_to_say'), 
    allowNull: false 
  },
  address: { 
    type: DataTypes.TEXT 
  },
  city: { 
    type: DataTypes.STRING(50) 
  },
  state: { 
    type: DataTypes.STRING(50) 
  },
  postal_code: { 
    type: DataTypes.STRING(20) 
  },
  country: { 
    type: DataTypes.STRING(50), 
    defaultValue: 'USA' 
  },
  emergency_contact_name: { 
    type: DataTypes.STRING(100) 
  },
  emergency_contact_phone: { 
    type: DataTypes.STRING(20) 
  },
  emergency_contact_relationship: { 
    type: DataTypes.STRING(50) 
  },
  blood_type: { 
    type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') 
  },
  allergies: { 
    type: DataTypes.TEXT 
  },
  medical_history: { 
    type: DataTypes.TEXT 
  },
  insurance_provider: { 
    type: DataTypes.STRING(100) 
  },
  insurance_policy_number: { 
    type: DataTypes.STRING(50) 
  },
  insurance_group_number: { 
    type: DataTypes.STRING(50) 
  },
  created_by: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  is_active: {
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
  tableName: 'patient',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['date_of_birth'] },
    { fields: ['blood_type'] },
    { fields: ['insurance_provider'] },
    { fields: ['patient_id'] },
    { fields: ['is_active'] }
  ]
});

// Association: Patient is a User
Patient.belongsTo(User, { foreignKey: 'id', as: 'user' });
User.hasOne(Patient, { foreignKey: 'id', as: 'patient' });

// Association: Patient created by Receptionist/User
Patient.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

module.exports = Patient;