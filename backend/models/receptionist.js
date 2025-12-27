const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

const Receptionist = sequelize.define('Receptionist', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    references: {
      model: User,
      key: 'id',
    }
  },
  receptionist_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  department: { 
    type: DataTypes.STRING(100)
  },
  shift_start: { 
    type: DataTypes.TIME
  },
  shift_end: { 
    type: DataTypes.TIME
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
  tableName: 'receptionist',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['department'] },
    { fields: ['is_available'] }
  ]
});

Receptionist.belongsTo(User, { foreignKey: 'id', as: 'user' });
User.hasOne(Receptionist, { foreignKey: 'id', as: 'receptionist' });

module.exports = Receptionist;
