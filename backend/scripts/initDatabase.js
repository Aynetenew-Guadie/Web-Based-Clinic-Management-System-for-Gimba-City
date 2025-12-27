const { sequelize } = require('../config/database');
const { testConnection } = require('../config/database');

// Import all models
const User = require('../models/user');
const Patient = require('../models/patient');
const Doctor = require('../models/doctor');
const Appointment = require('../models/appointment');
const MedicalRecord = require('../models/medicalRecord');
const Prescription = require('../models/prescription');
const LabTestCategory = require('../models/labTestCategory');
const LabTest = require('../models/labTest');
const LabResult = require('../models/labResult');
const ServiceCategory = require('../models/serviceCategory');
const Billing = require('../models/billing');
const AttendanceLog = require('../models/attendanceLog');
const Shift = require('../models/shift');
const SystemSetting = require('../models/systemsetting');
const AuditLog = require('../models/auditLog');

async function initializeDatabase() {
  try {
    console.log('🔌 Testing database connection...');
    await testConnection();
    
    console.log('🗄️  Initializing database models...');
    
    // Define associations
    console.log('🔗 Setting up model associations...');
    
    // User associations
    User.hasOne(Patient, { foreignKey: 'id', as: 'patient' });
    User.hasOne(Doctor, { foreignKey: 'id', as: 'doctor' });
    User.hasMany(Appointment, { foreignKey: 'patient_id', as: 'patientAppointments' });
    User.hasMany(Appointment, { foreignKey: 'doctor_id', as: 'doctorAppointments' });
    User.hasMany(Appointment, { foreignKey: 'created_by', as: 'createdAppointments' });
    User.hasMany(MedicalRecord, { foreignKey: 'patient_id', as: 'patientRecords' });
    User.hasMany(MedicalRecord, { foreignKey: 'doctor_id', as: 'doctorRecords' });
    User.hasMany(Prescription, { foreignKey: 'patient_id', as: 'patientPrescriptions' });
    User.hasMany(Prescription, { foreignKey: 'doctor_id', as: 'doctorPrescriptions' });
    User.hasMany(LabTest, { foreignKey: 'patient_id', as: 'patientLabTests' });
    User.hasMany(LabTest, { foreignKey: 'doctor_id', as: 'doctorLabTests' });
    User.hasMany(LabResult, { foreignKey: 'technician_id', as: 'technicianResults' });
    User.hasMany(Billing, { foreignKey: 'patient_id', as: 'patientBilling' });
    User.hasMany(AttendanceLog, { foreignKey: 'user_id', as: 'attendanceLogs' });
    User.hasMany(Shift, { foreignKey: 'user_id', as: 'shifts' });
    User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
    
    // Lab test associations
    LabTestCategory.hasMany(LabTest, { foreignKey: 'category_id', as: 'tests' });
    LabTest.belongsTo(LabTestCategory, { foreignKey: 'category_id', as: 'category' });
    
    // Service category associations
    ServiceCategory.hasMany(Billing, { foreignKey: 'service_category_id', as: 'billingRecords' });
    Billing.belongsTo(ServiceCategory, { foreignKey: 'service_category_id', as: 'serviceCategory' });
    
    console.log('✅ Model associations configured successfully');
    
    // Sync database (create tables if they don't exist)
    console.log('🔄 Syncing database...');
    const syncOptions = process.env.NODE_ENV === 'development' ? { alter: true } : { force: false };
    await sequelize.sync(syncOptions);
    
    console.log('✅ Database synchronized successfully');
    
    // Insert initial data if tables are empty
    console.log('📝 Checking for initial data...');
    
    // Check if lab test categories exist
    const categoryCount = await LabTestCategory.count();
    if (categoryCount === 0) {
      console.log('📋 Inserting default lab test categories...');
      await LabTestCategory.bulkCreate([
        { name: 'Blood Tests', description: 'Complete blood count, chemistry panels, and other blood-based tests' },
        { name: 'Urine Tests', description: 'Urinalysis and other urine-based diagnostic tests' },
        { name: 'Imaging', description: 'X-rays, CT scans, MRI, and other imaging studies' },
        { name: 'Cardiology', description: 'ECG, echocardiogram, and other cardiac tests' },
        { name: 'Microbiology', description: 'Culture and sensitivity tests for infections' }
      ]);
      console.log('✅ Lab test categories inserted');
    }
    
    // Check if service categories exist
    const serviceCount = await ServiceCategory.count();
    if (serviceCount === 0) {
      console.log('💰 Inserting default service categories...');
      await ServiceCategory.bulkCreate([
        { name: 'Consultation', description: 'Doctor consultation fees' },
        { name: 'Laboratory', description: 'Laboratory test services' },
        { name: 'Imaging', description: 'Radiology and imaging services' },
        { name: 'Procedures', description: 'Medical procedures and treatments' },
        { name: 'Medications', description: 'Prescription medications' }
      ]);
      console.log('✅ Service categories inserted');
    }
    
    // Check if system settings exist
    const settingCount = await SystemSetting.count();
    if (settingCount === 0) {
      console.log('⚙️  Inserting default system settings...');
      await SystemSetting.bulkCreate([
        { key: 'clinic_name', value: 'General Clinic', setting_type: 'string', description: 'Name of the clinic' },
        { key: 'clinic_address', value: '123 Medical Center Dr', setting_type: 'string', description: 'Clinic address' },
        { key: 'clinic_phone', value: '+1-555-0123', setting_type: 'string', description: 'Clinic phone number' },
        { key: 'appointment_duration', value: '30', setting_type: 'number', description: 'Default appointment duration in minutes' },
        { key: 'max_appointments_per_day', value: '50', setting_type: 'number', description: 'Maximum appointments per day' },
        { key: 'enable_sms_notifications', value: 'true', setting_type: 'boolean', description: 'Enable SMS notifications' },
        { key: 'enable_email_notifications', value: 'true', setting_type: 'boolean', description: 'Enable email notifications' }
      ]);
      console.log('✅ System settings inserted');
    }
    
    console.log('🎉 Database initialization completed successfully!');
    console.log('\n📊 Database Summary:');
    console.log(`   - Users: ${await User.count()}`);
    console.log(`   - Patients: ${await Patient.count()}`);
    console.log(`   - Doctors: ${await Doctor.count()}`);
    console.log(`   - Appointments: ${await Appointment.count()}`);
    console.log(`   - Lab Test Categories: ${await LabTestCategory.count()}`);
    console.log(`   - Service Categories: ${await ServiceCategory.count()}`);
    console.log(`   - System Settings: ${await SystemSetting.count()}`);
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

async function resetDatabase() {
  try {
    console.log('⚠️  WARNING: This will drop all tables and recreate them!');
    console.log('🔄 Resetting database...');
    
    await sequelize.sync({ force: true });
    
    console.log('✅ Database reset completed');
    
    // Re-run initialization
    await initializeDatabase();
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  }
}

// Export functions
module.exports = {
  initializeDatabase,
  resetDatabase
};

// Run if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'reset') {
    resetDatabase()
      .then(() => {
        console.log('✅ Database reset completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Database reset failed:', error);
        process.exit(1);
      });
  } else {
    initializeDatabase()
      .then(() => {
        console.log('✅ Database initialization completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
      });
  }
}
