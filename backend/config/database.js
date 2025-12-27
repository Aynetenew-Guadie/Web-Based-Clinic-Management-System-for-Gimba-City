const { Sequelize } = require('sequelize');
const config = require('./config');
const sequelize = new Sequelize(
  config.db.database,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10, 
      min: 0, 
      acquire: 30000,
      idle: 10000,
    },
    timeout: 60000,
    retry: {
      max: 3,
      timeout: 1000,
    },
  }
);
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    throw error;
  }
}
process.on('SIGINT', async () => {
  try {
    await sequelize.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error closing database connection:', error);
    process.exit(1);
  }
});

module.exports = { sequelize, testConnection };
