const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServiceCategory = sequelize.define('ServiceCategory', {
  id: { 
    type: DataTypes.INTEGER.UNSIGNED, 
    primaryKey: true, 
    autoIncrement: true 
  },
  name: { 
    type: DataTypes.STRING(100), 
    allowNull: false, 
    unique: true 
  },
  description: { 
    type: DataTypes.TEXT 
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
  tableName: 'service_category',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['is_active'] }
  ]
});

module.exports = ServiceCategory;
