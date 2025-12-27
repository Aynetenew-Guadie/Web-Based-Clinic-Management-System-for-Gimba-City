const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

const Shift = sequelize.define('Shift', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER.UNSIGNED, references: { model: User, key: 'id' }, allowNull: false },
  startTime: { type: DataTypes.DATE, allowNull: false },
  endTime: { type: DataTypes.DATE, allowNull: false },
  role: { type: DataTypes.ENUM('doctor', 'receptionist', 'lab_technician', 'admin') },
}, {
  timestamps: true,
});

Shift.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = Shift;
