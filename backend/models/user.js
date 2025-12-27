const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  username: { 
    type: DataTypes.STRING(50), 
    allowNull: false, 
    unique: true 
  },
  email: { 
    type: DataTypes.STRING(100), 
    allowNull: false, 
    unique: true 
  },
  password_hash: { 
    type: DataTypes.STRING(255), 
    allowNull: false 
  },
  role: { 
    type: DataTypes.ENUM('patient', 'doctor', 'receptionist', 'lab_technician', 'admin', 'pharmacist'), 
    allowNull: false 
  },
  first_name: { 
    type: DataTypes.STRING(50), 
    allowNull: false 
  },
  last_name: { 
    type: DataTypes.STRING(50), 
    allowNull: false 
  },
  phone: { 
    type: DataTypes.STRING(20) 
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 150
    }
  },
  employee_id: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: true 
  },
  is_active: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true 
  },
  last_login: { 
    type: DataTypes.DATE 
  },
  created_at: { 
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: { 
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
}, {
  tableName: 'user',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      // Normalize email to avoid case-sensitivity issues
      if (user.email) {
        user.email = user.email.toLowerCase().trim();
      }

      if (user.password_hash) {
        // If the password already looks like a bcrypt hash (e.g. starts with $2b$/$2a$/$2y$), skip re-hashing
        if (!/^\$2[aby]\$/.test(user.password_hash)) {
          const salt = await bcrypt.genSalt(12);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
        }
      }
      // Generate username if not provided
      if (!user.username) {
        user.username = user.email;
      }
    },
    beforeUpdate: async (user) => {
      // Normalize email when it's changed
      if (user.changed && typeof user.changed === 'function' && user.changed('email')) {
        user.email = user.email.toLowerCase().trim();
      }

      if (user.changed('password_hash')) {
        // Only hash if it's not already a bcrypt hash
        if (!/^\$2[aby]\$/.test(user.password_hash)) {
          const salt = await bcrypt.genSalt(12);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
        }
      }
    }
  },
  indexes: [
    { fields: ['username'] },
    { fields: ['email'] },
    { fields: ['role'] },
    { fields: ['is_active'] }
  ]
});

// Instance method to check password
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

// Instance method to generate employee ID based on role
User.prototype.generateEmployeeId = function() {
  const prefix = {
    'doctor': 'DOC',
    'receptionist': 'REC',
    'lab_technician': 'LAB',
    'admin': 'ADM',
    'pharmacist': 'PHA'
  }[this.role];
  
  if (prefix) {
    return `${prefix}${this.id.toString().padStart(6, '0')}`;
  }
  return null;
};

module.exports = User;