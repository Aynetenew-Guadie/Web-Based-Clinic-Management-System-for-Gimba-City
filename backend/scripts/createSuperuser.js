// scripts/createSuperuser.js

const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const User = require('../models/user');
    
async function createSuperUser() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');
    
    const email = process.argv[2] || 'feredeworkineh4@gmail.com';
    const password = process.argv[3] || 'fd@2127!';
    const hashedPassword = await bcrypt.hash(String(password), 10);

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      console.log('❗ Superuser already exists:', email);
      process.exit(0);
    }

    const username = email.split('@')[0];

    await User.create({
      username,
      email,
      password_hash: hashedPassword, // use the hashed column name your project expects
      role: 'admin',                  // adjust role if you use 'superuser'
      first_name: 'Super',
      last_name: 'Admin',
      phone: '',
      is_active: true,
      // add either isAdmin or is_admin depending on your model
      isAdmin: true,
      is_admin: true
    });

    console.log('✅ Superuser created:', email);
    process.exit(0);
  } catch (err) {
    console.error('Error creating superuser:', err);
    process.exit(1);
  }
}

createSuperUser();
