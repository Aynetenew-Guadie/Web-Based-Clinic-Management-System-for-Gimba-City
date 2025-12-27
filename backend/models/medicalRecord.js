const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');
const Appointment = require('./appointment');

const MedicalRecord = sequelize.define('MedicalRecord', {
  id: { 
    type: DataTypes.INTEGER.UNSIGNED, 
    primaryKey: true, 
    autoIncrement: true 
  },
  patient_id: { 
    type: DataTypes.INTEGER.UNSIGNED, 
    references: { model: User, key: 'id' }, 
    allowNull: false 
  },
  doctor_id: { 
    type: DataTypes.INTEGER.UNSIGNED, 
    references: { model: User, key: 'id' } 
  },
  appointment_id: { 
    type: DataTypes.INTEGER.UNSIGNED 
  },
  record_date: { 
    type: DataTypes.DATE, 
    allowNull: false 
  },
  chief_complaint: { 
    type: DataTypes.TEXT 
  },
  symptoms: { 
    type: DataTypes.TEXT 
  },
  diagnosis: { 
    type: DataTypes.TEXT 
  },
  treatment_plan: { 
    type: DataTypes.TEXT 
  },
  clinical_notes: { 
    type: DataTypes.TEXT 
  },
  vital_signs: { 
    type: DataTypes.JSON 
  },
  height_cm: { 
    type: DataTypes.DECIMAL(5, 2) 
  },
  weight_kg: { 
    type: DataTypes.DECIMAL(5, 2) 
  },
  blood_pressure_systolic: { 
    type: DataTypes.INTEGER.UNSIGNED 
  },
  blood_pressure_diastolic: { 
    type: DataTypes.INTEGER.UNSIGNED 
  },
  temperature_celsius: { 
    type: DataTypes.DECIMAL(4, 2) 
  },
  pulse_rate: { 
    type: DataTypes.INTEGER.UNSIGNED 
  },
  respiratory_rate: { 
    type: DataTypes.INTEGER.UNSIGNED 
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
  tableName: 'medical_record',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['patient_id', 'record_date'] },
    { fields: ['doctor_id', 'record_date'] },
    { fields: ['appointment_id'] }
  ]
});

MedicalRecord.belongsTo(User, { foreignKey: 'patient_id', as: 'patient' });
MedicalRecord.belongsTo(User, { foreignKey: 'doctor_id', as: 'doctor' });
MedicalRecord.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

module.exports = MedicalRecord;
