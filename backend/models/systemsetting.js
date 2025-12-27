const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemSetting = sequelize.define('SystemSetting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  key: { type: DataTypes.STRING, unique: true, allowNull: false },
  value: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
}, {
  timestamps: false,
});

module.exports = SystemSetting;
