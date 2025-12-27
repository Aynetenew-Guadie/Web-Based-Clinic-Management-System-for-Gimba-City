// Run this script with: node backend/scripts/normalize-user-emails.js
// It will lowercase and trim all user emails in the database to avoid login case-sensitivity issues

const { sequelize } = require('../config/database');
const User = require('../models/user');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    const users = await User.findAll();
    let updated = 0;

    for (const user of users) {
      const normalized = user.email ? user.email.toLowerCase().trim() : user.email;
      if (normalized && normalized !== user.email) {
        await user.update({ email: normalized });
        console.log(`Updated user ${user.id} email: ${user.email} -> ${normalized}`);
        updated++;
      }
    }

    console.log(`Normalization complete. ${updated} user(s) updated.`);
    process.exit(0);
  } catch (err) {
    console.error('Normalization failed:', err);
    process.exit(1);
  }
})();