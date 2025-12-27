const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

const AuditLog = sequelize.define('AuditLog', {
  id: { 
    type: DataTypes.INTEGER.UNSIGNED, 
    primaryKey: true, 
    autoIncrement: true 
  },
  user_id: { 
    type: DataTypes.INTEGER.UNSIGNED 
  },
  action: { 
    type: DataTypes.STRING(100), 
    allowNull: false 
  },
  table_name: { 
    type: DataTypes.STRING(100) 
  },
  record_id: { 
    type: DataTypes.INTEGER.UNSIGNED 
  },
  old_values: { 
    type: DataTypes.JSON 
  },
  new_values: { 
    type: DataTypes.JSON 
  },
  ip_address: { 
    type: DataTypes.STRING(45) 
  },
  user_agent: { 
    type: DataTypes.TEXT 
  },
  timestamp: { 
    type: DataTypes.DATE, 
    allowNull: false 
  },
  createdAt: { 
    type: DataTypes.DATE, 
    field: 'created_at' 
  }
}, {
  tableName: 'audit_log',
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['user_id', 'timestamp'] },
    { fields: ['action'] },
    { fields: ['table_name'] },
    { fields: ['timestamp'] }
  ]
});

AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = AuditLog;
