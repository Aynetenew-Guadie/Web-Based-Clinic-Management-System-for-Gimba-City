require('dotenv').config();

// Global handlers to capture hidden crashes during dev
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught exception:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason, p) => {
    console.error('❌ Unhandled rejection at:', p, 'reason:', reason);
});
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const config = require('./config/config');
console.log(`Admin-only password reset (server): ${config.adminOnlyPasswordReset}`);

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});



// Use Sequelize models / database where available
const { sequelize, testConnection } = require('./config/database');
const UserModel = require('./models/user');
const PatientModel = require('./models/patient');
const AppointmentModel = require('./models/appointment');
const authController = require('./controllers/authController');

// Test DB connection on startup
testConnection().catch(err => console.warn('DB test failed, falling back to in-memory mocks if available'));

// In-memory fallbacks (kept for backward compatibility during migration)
let users = [
    {
        id: 1,
        email: 'feredeworkineh4@gmail.com',
        password: '$2b$10$W5objKtTw8DO8mKqDya0HeTCtGNFW6zU9NrVGPQ3I.cUC/22UDega',
        password_hash: '$2b$10$W5objKtTw8DO8mKqDya0HeTCtGNFW6zU9NrVGPQ3I.cUC/22UDega',
        name: 'Ferede Workineh',
        role: 'admin',
        clinicId: 1,
        isActive: true,
        createdAt: '2024-01-01',
        lastLogin: '2024-01-15'
    }
];
// Expose in-memory users to controllers for demo/fallback purposes
global.users = users;

// Add a sample doctor user so in-memory notes can show doctor name
users.push({
    id: 2,
    email: 'dr.michael@clinic.com',
    password: '$2b$10$examplehashedpassword',
    name: 'Dr. Michael Brown',
    first_name: 'Michael',
    last_name: 'Brown',
    role: 'doctor',
    clinicId: 1,
    isActive: true,
    createdAt: '2024-01-01'
});

// Add a sample lab technician user so labResults can show technician info in dev
users.push({
    id: 4,
    email: 'lab.tech@clinic.com',
    password: '$2b$10$examplehashedpassword',
    name: 'Lab Technician A',
    first_name: 'Lab',
    last_name: 'Technician A',
    role: 'lab_technician',
    clinicId: 1,
    isActive: true,
    createdAt: '2024-01-01'
});

// Mock data for other entities
let appointments = [
    { id: 1, patientId: 1, patientName: 'John Doe', doctorId: 2, doctorName: 'Dr. Michael Brown', date: '2024-01-15', time: '10:00 AM', status: 'completed', type: 'Checkup' },
    { id: 2, patientId: 2, patientName: 'Alice Johnson', doctorId: 2, doctorName: 'Dr. Michael Brown', date: '2024-01-15', time: '11:00 AM', status: 'pending', type: 'Consultation' },
    { id: 3, patientId: 3, patientName: 'Bob Smith', doctorId: 2, doctorName: 'Dr. Michael Brown', date: '2024-01-16', time: '09:30 AM', status: 'scheduled', type: 'Follow-up' }
];

// Retroactively enrich in-memory appointments with any missing patient/doctor information
appointments = appointments.map(appt => {
    const enriched = { ...appt };
    if (!enriched.patientName) {
        const p = patients.find(x => x.id === enriched.patientId || x.patientId === enriched.patientId);
        if (p) {
            enriched.patientName = p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
            enriched.patient = { id: p.id, name: enriched.patientName, email: p.email, phone: p.phone };
        }
    }
    if (!enriched.doctorName) {
        const d = users.find(u => u.id === enriched.doctorId || u.doctor_id === enriched.doctorId);
        if (d) {
            enriched.doctorName = d.name || d.first_name || `Dr. ${d.id}`;
            enriched.doctor = { id: d.id, name: enriched.doctorName, email: d.email };
        }
    }
    return enriched;
});

let patients = [
    { id: 1, name: 'John Doe', email: 'john@example.com', phone: '+1234567890', age: 35, gender: 'Male', lastVisit: '2024-01-15' },
    { id: 2, name: 'Alice Johnson', email: 'alice@example.com', phone: '+1234567891', age: 28, gender: 'Female', lastVisit: '2024-01-14' },
    { id: 3, name: 'Bob Smith', email: 'bob@example.com', phone: '+1234567892', age: 45, gender: 'Male', lastVisit: '2024-01-10' }
];

// Mock lab requests/results
let labRequests = [
    { id: 1, patientId: 1, doctorId: 2, testType: 'Blood Test', urgency: 'normal', status: 'pending', dateRequested: '2024-01-15' }
];

let labResults = [
    { id: 1, labRequestId: 1, patientId: 1, technicianId: 4, resultDetails: 'All parameters within normal range', date: '2024-01-16' }
];

// In-memory appointment requests (patient-submitted)
let appointmentRequests = [
    { id: 1, patientId: 1, preferred_date: '2024-01-20', preferred_time_slot: 'morning', visit_type: 'consultation', urgency: 'normal', symptoms: 'Fever and cough', notes: '', status: 'pending', createdAt: '2024-01-10' }
];

// Mock prescriptions and medical records for patient endpoints
let prescriptions = [
    { id: 1, patientId: 1, doctorId: 2, medication: 'Amoxicillin', dosage: '500mg', frequency: '3 times daily', notes: 'Take after meals', date: '2024-01-15' }
];

let medicalRecords = [
    { id: 1, patientId: 1, doctorId: 2, appointmentId: 1, note: 'Mild fever, prescribed antibiotics', date: '2024-01-15' }
];

// NEW: Mock billing data as ARRAY (fix for AdminBilling.js error)
let billings = [
    { 
        id: 1, 
        patientId: 1, 
        patientName: 'John Doe', 
        amount: 150, 
        status: 'paid', 
        date: '2024-01-15', 
        serviceType: 'Consultation',
        invoiceNumber: 'INV-001',
        description: 'Regular consultation fee'
    },
    { 
        id: 2, 
        patientId: 2, 
        patientName: 'Alice Johnson', 
        amount: 200, 
        status: 'pending', 
        date: '2024-01-14', 
        serviceType: 'Lab Tests',
        invoiceNumber: 'INV-002',
        description: 'Blood test and analysis'
    },
    { 
        id: 3, 
        patientId: 3, 
        patientName: 'Bob Smith', 
        amount: 75, 
        status: 'paid', 
        date: '2024-01-13', 
        serviceType: 'Checkup',
        invoiceNumber: 'INV-003',
        description: 'Routine health checkup'
    }
];

// NEW: Mock settings data
let settings = {
    hospitalName: 'MedCare Hospital',
    hospitalAddress: '123 Healthcare St, Medical City',
    hospitalPhone: '+1-555-0123',
    hospitalEmail: 'info@medcarehospital.com',
    appointmentDuration: 30,
    workingHours: {
        start: '08:00',
        end: '18:00'
    },
    billing: {
        consultationFee: 50,
        emergencyFee: 100,
        followUpFee: 30
    }
};

// Helper functions
function generateRoleSpecificId(userId, role) {
    const prefixes = {
        'admin': 'ADM',
        'doctor': 'DOC',
        'receptionist': 'REC',
        'lab_technician': 'LAB',
        'patient': 'PAT'
    };
    return `${prefixes[role] || 'USR'}${String(userId).padStart(6, '0')}`;
}

function getDepartmentByRole(role) {
    const departments = {
        'admin': 'Administration',
        'doctor': 'Medical',
        'receptionist': 'Front Desk',
        'lab_technician': 'Laboratory',
        'patient': 'Patient Services'
    };
    return departments[role] || 'General';
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

// ==================== BASIC ENDPOINTS ====================

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Clinic Management API is running',
        timestamp: new Date().toISOString()
    });
});

// Always-available dev endpoint (safe, no dependencies) to return in-memory prescriptions
app.get('/api/dev/prescriptions', (req, res) => {
    try {
        const list = Array.isArray(global.prescriptions) ? global.prescriptions : [];
        console.log(`[DEV ROUTE] /api/dev/prescriptions requested - returning ${list.length} items`);
        return res.json({ success: true, count: list.length, data: list });
    } catch (err) {
        console.error('DEV route error:', err);
        return res.status(500).json({ success: false, error: 'Dev endpoint error' });
    }
});

// DEV POST route to add an in-memory prescription (debugging only)
app.post('/api/dev/prescriptions', (req, res) => {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ success: false, error: 'Forbidden in production' });

    try {
        const { patientId, doctorId, medication, dosage = 'Not specified', frequency = 'Not specified', status = 'prescribed', instructions = '' } = req.body || {};
        if (!patientId || !doctorId || !medication) return res.status(400).json({ success: false, error: 'patientId, doctorId and medication are required' });

        if (!Array.isArray(global.prescriptions)) global.prescriptions = [];
        const newId = (global.prescriptions.length ? (global.prescriptions[0].id || Date.now()) + 1 : Date.now());
        const record = {
            id: newId,
            patientId,
            doctorId,
            medication,
            dosage,
            frequency,
            instructions,
            status,
            dateIssued: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        global.prescriptions.unshift(record);
        console.log(`[DEV ROUTE] Added in-memory prescription id=${record.id}`);
        return res.status(201).json({ success: true, data: record });
    } catch (err) {
        console.error('DEV POST route error:', err);
        return res.status(500).json({ success: false, error: 'Dev endpoint error' });
    }
});

// DEV: expose database-backed prescriptions for debugging (not for production)
app.get('/api/dev/db-prescriptions', async (req, res) => {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ success: false, error: 'Forbidden in production' });
    try {
        const Prescription = require('./models/prescription');
        const list = await Prescription.findAll({ order: [['createdAt', 'DESC']], limit: 200 });
        console.log(`[DEV ROUTE] /api/dev/db-prescriptions requested - returning ${list.length} items`);
        return res.json({ success: true, count: list.length, data: list });
    } catch (err) {
        console.error('DEV db-prescriptions route error:', err);
        return res.status(500).json({ success: false, error: 'Dev DB endpoint error' });
    }
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

// DEV ONLY: expose full in-memory users (including password hashes) for debugging
// DO NOT enable in production
app.get('/api/dev/users/full', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ success: false, error: 'Forbidden in production' });
    }
    res.json({ success: true, users });
});

// DEV ONLY: check if a plaintext password matches stored user (returns compare result)
// POST { email, password }
app.post('/api/dev/check-password', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ success: false, error: 'Forbidden in production' });
    }

    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, error: 'email and password are required' });

    // search in-memory users first
    const mem = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase().trim());
    if (!mem) return res.status(404).json({ success: false, error: 'User not found in memory store' });

    try {
        const match = await bcrypt.compare(password, mem.password);
        return res.json({ success: true, email: mem.email, match, storedLength: mem.password ? mem.password.length : 0, storedPreview: mem.password ? mem.password.slice(0, 12) : null });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/', (req, res) => {
    res.json({
        message: 'Clinic Management System API',
        version: '1.0.0',
        endpoints: [
            'GET  /api/health',
            'GET  /api/test',
            'POST /api/auth/login',
            'POST /api/auth/forgot-password',
            'GET  /api/auth/verify-reset-token/:token',
            'POST /api/auth/reset-password',
            'GET  /api/admin/overview',
            'GET  /api/admin/users/stats',
            'GET  /api/admin/billing/stats',
            'GET  /api/admin/stats',
            'GET  /api/admin/users',
            'POST /api/admin/users',
            'PUT  /api/admin/users/:id',      // NEW
            'DELETE /api/admin/users/:id',    // NEW
            'GET  /api/admin/billing',
            'PUT  /api/admin/billing/:id',    // NEW
            'DELETE /api/admin/billing/:id',  // NEW
            'GET  /api/admin/settings',       // NEW
            'PUT  /api/admin/settings',       // NEW
            'GET  /api/system/data',
            'GET  /api/activity/recent',
            'GET  /api/dashboard/:role',
            'GET  /api/admin/dashboard',
            'GET  /api/doctor/dashboard',
            'GET  /api/patient/dashboard',
            'GET  /api/reception/dashboard',
            'GET  /api/lab/dashboard',
            'GET  /api/reception/patients',
            'POST /api/reception/register-patient',
            'GET  /api/reception/scheduled-appointments',
            'GET  /api/reception/billing',
            'GET  /api/reception/appointment-requests',
            'GET  /api/reception/available-doctors',
            'GET  /api/reception/patient-queue'
        ]
    });
});

// ==================== AUTH ENDPOINTS ====================

// Mount auth Router (contains register, login, forgot/reset endpoints)
app.use('/api/auth', require('./routes/authRoutes'));

// Pharmacist routes (view and dispense prescriptions)
app.use('/api/pharmacist', require('./routes/pharmacistRoutes'));

// Login is handled by the auth router (`/api/auth/login`) which delegates to `authController.login` for consistent behavior and improved logging.

// Password reset (mounted into main server for compatibility with existing inline routes)
app.post('/api/auth/forgot-password', authController.forgotPassword);
app.get('/api/auth/verify-reset-token/:token', authController.verifyResetToken);
app.post('/api/auth/reset-password', authController.resetPassword);

// Dev-only email preview endpoint (do NOT expose in production)
if (process.env.NODE_ENV !== 'production') {
    try {
        const { getRecentEmails } = require('./utils/emailService');
        app.get('/api/dev/emails', (req, res) => {
            return res.json({ success: true, count: getRecentEmails().length, data: getRecentEmails() });
        });

        // Dev endpoints: whoami (requires auth) and prescriptions (view in-memory)
        try {
          const authMiddleware = require('./middlewares/authMiddleware');

          app.get('/api/dev/whoami', authMiddleware(), (req, res) => {
            if (process.env.NODE_ENV === 'production') {
              return res.status(403).json({ success: false, error: 'Not available in production' });
            }
            return res.json({ success: true, user: req.user });
          });

          app.get('/api/dev/prescriptions', (req, res) => {
            if (process.env.NODE_ENV === 'production') {
              return res.status(403).json({ success: false, error: 'Not available in production' });
            }
            const list = Array.isArray(global.prescriptions) ? global.prescriptions : [];
            return res.json({ success: true, count: list.length, data: list });
          });
        } catch (e) {
          console.warn('Dev whoami/prescriptions endpoint not available:', e.message);
        }

    } catch (err) {
        console.warn('Dev email preview not available:', err.message);
    }
}

// Dev endpoints (registered regardless of NODE_ENV); handlers return 403 in production
try {
  const authMiddleware = require('./middlewares/authMiddleware');

  app.get('/api/dev/prescriptions', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, error: 'Not available in production' });
    }
    const list = Array.isArray(global.prescriptions) ? global.prescriptions : [];
    console.log(`[DEV] /api/dev/prescriptions requested - returning ${list.length} items`);
    return res.json({ success: true, count: list.length, data: list });
  });

  app.get('/api/dev/whoami', authMiddleware(), (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, error: 'Not available in production' });
    }
    console.log(`[DEV] /api/dev/whoami requested by user=${req.user?.id || 'anon'}`);
    return res.json({ success: true, user: req.user || null });
  });
} catch (e) {
  console.warn('Dev endpoints not available:', e.message);
}

// ==================== ADMIN CRUD ENDPOINTS ====================

// GET all users - ENHANCED with role-specific IDs
app.get('/api/admin/users', (req, res) => {
    console.log('👥 Users list requested');
    
    const enhancedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return {
            ...userWithoutPassword,
            username: user.email.split('@')[0],
            first_name: user.name.split(' ')[0] || user.name,
            last_name: user.name.split(' ')[1] || '',
            phone: user.phone || '+251 91 234 5678',
            department: getDepartmentByRole(user.role),
            is_active: user.isActive !== undefined ? user.isActive : true,
            created_at: user.createdAt,
            last_login: user.lastLogin,
            role_specific_id: generateRoleSpecificId(user.id, user.role)
        };
    });

    console.log(`📊 Returning ${enhancedUsers.length} users`);
    
    res.json({
        success: true,
        data: enhancedUsers,
        count: users.length
    });
});

// GET a single user by ID (returns user without password fields)
app.get('/api/admin/users/:id', (req, res) => {
    console.log('🔎 /api/admin/users/:id requested for id=', req.params.id);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid user id' });
    const user = users.find(u => u.id === id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const { password, password_hash, ...userWithoutPassword } = user;
    return res.json({ success: true, user: userWithoutPassword });
});

// CREATE new user
app.post('/api/admin/users', async (req, res) => {
    console.log('🆕 Create user request:', req.body);
    
    try {
        // Support different shapes: accept name OR first_name+last_name, and accept either password or password_plain
        const { name, first_name, last_name, email, password, password_plain, role, phone, specialization } = req.body;

        // Compose full name if not provided
        const fullName = name || ([first_name, last_name].filter(Boolean).join(' ') || null);

        // Accept password from either field
        const plainPassword = password || password_plain;

        // Validation
        if (!fullName || !email || !plainPassword || !role) {
            return res.status(400).json({
                success: false,
                error: 'Name (or first_name+last_name), email, password, and role are required'
            });
        }

        // Check if user already exists
        const existingUser = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User with this email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // Create new user object
        const newUser = {
            id: users.length + 1,
            name: fullName,
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            password_hash: hashedPassword, // keep both fields for compatibility
            username: email.split('@')[0],
            role,
            phone: phone || '',
            specialization: specialization || '',
            clinicId: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            lastLogin: null
        };

        // Add to users array
        users.push(newUser);

        console.log('✅ User created successfully:', { email: newUser.email, role: newUser.role, id: newUser.id });

        // Return enhanced user data without password
        const { password: _, password_hash: __, ...userWithoutPassword } = newUser;
        const userResponse = {
            ...userWithoutPassword,
            username: newUser.username || newUser.email.split('@')[0],
            first_name: (first_name || newUser.name.split(' ')[0] || newUser.name),
            last_name: (last_name || newUser.name.split(' ')[1] || ''),
            phone: newUser.phone || '+251 91 234 5678',
            department: getDepartmentByRole(newUser.role),
            is_active: true,
            created_at: newUser.createdAt,
            last_login: null,
            role_specific_id: generateRoleSpecificId(newUser.id, newUser.role)
        };

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: userResponse
        });

    } catch (error) {
        console.error('❌ Error creating user:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while creating user'
        });
    }
});

// UPDATE user - NEW ENDPOINT
app.put('/api/admin/users/:id', async (req, res) => {
    console.log('✏️ Update user request:', { id: req.params.id, body: req.body });
    
    try {
        const userId = parseInt(req.params.id);
        const { name, email, role, phone, specialization, isActive } = req.body;

        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if email is already taken by another user
        if (email && email !== users[userIndex].email) {
            const existingUser = users.find(u => u.email === email && u.id !== userId);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already taken by another user'
                });
            }
        }

        // Update user
        if (name) users[userIndex].name = name;
        if (email) users[userIndex].email = email;
        if (role) users[userIndex].role = role;
        if (phone !== undefined) users[userIndex].phone = phone;
        if (specialization !== undefined) users[userIndex].specialization = specialization;
        if (isActive !== undefined) users[userIndex].isActive = isActive;

        console.log('✅ User updated successfully:', { id: userId, email: users[userIndex].email });

        // Return enhanced user data without password
        const { password, ...userWithoutPassword } = users[userIndex];
        const userResponse = {
            ...userWithoutPassword,
            username: users[userIndex].email.split('@')[0],
            first_name: users[userIndex].name.split(' ')[0] || users[userIndex].name,
            last_name: users[userIndex].name.split(' ')[1] || '',
            phone: users[userIndex].phone || '+251 91 234 5678',
            department: getDepartmentByRole(users[userIndex].role),
            is_active: users[userIndex].isActive,
            created_at: users[userIndex].createdAt,
            last_login: users[userIndex].lastLogin,
            role_specific_id: generateRoleSpecificId(users[userIndex].id, users[userIndex].role)
        };

        res.json({
            success: true,
            message: 'User updated successfully',
            data: userResponse
        });

    } catch (error) {
        console.error('❌ Error updating user:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while updating user'
        });
    }
});

// DELETE user - NEW ENDPOINT (FIX for 404 error)
app.delete('/api/admin/users/:id', (req, res) => {
    console.log('🗑️ Delete user request:', req.params.id);
    
    try {
        const userId = parseInt(req.params.id);

        // Prevent deletion of own account
        if (userId === 1) { // Assuming user 1 is the main admin
            return res.status(400).json({
                success: false,
                error: 'Cannot delete the main administrator account'
            });
        }

        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Remove user from array
        const deletedUser = users.splice(userIndex, 1)[0];

        console.log('✅ User deleted successfully:', { id: userId, email: deletedUser.email });

        res.json({
            success: true,
            message: 'User deleted successfully',
            data: { id: userId }
        });

    } catch (error) {
        console.error('❌ Error deleting user:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while deleting user'
        });
    }
});

// ADMIN: Reset user password (supports providing a password or auto-generating one)
app.post('/api/admin/users/:id/reset-password', async (req, res) => {
    console.log('🔁 Admin reset password request for user:', req.params.id);
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, error: 'Invalid user id' });
        }

        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Generate secure password if none provided
        const generatePassword = () => {
            const raw = require('crypto').randomBytes(9).toString('base64');
            return raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'TempPass123!';
        };

        const provided = req.body && req.body.password && String(req.body.password).trim();
        const newPasswordPlain = provided ? String(req.body.password).trim() : generatePassword();

        const hashed = await bcrypt.hash(newPasswordPlain, 10);

        // Update in-memory user
        users[userIndex].password = hashed;
        users[userIndex].password_hash = hashed;

        // Attempt to send notification email
        let emailSent = false;
        try {
            const token = jwt.sign({ id: users[userIndex].id }, config.jwtSecret, { expiresIn: '1h' });
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
            const subject = 'Your password has been reset by admin';
            const text = `Your password was reset by an administrator. Your temporary password is: ${newPasswordPlain}. Please set a new password here: ${resetUrl}`;
            const html = `<p>Your password was reset by an administrator.</p><p>Your temporary password is: <strong>${newPasswordPlain}</strong></p><p>Set a new password here: <a href="${resetUrl}">${resetUrl}</a></p><p>The link expires in 1 hour.</p>`;
            const { sendEmail } = require('./utils/emailService');
            await sendEmail({ to: users[userIndex].email, subject, text, html });
            emailSent = true;
            console.log('📧 Reset password email sent to:', users[userIndex].email);
        } catch (emailErr) {
            console.warn('⚠️ Failed to send reset email (dev SMTP may be missing):', emailErr && emailErr.message ? emailErr.message : emailErr);
        }

        res.json({ success: true, message: 'Password reset successfully', generatedPassword: newPasswordPlain, emailSent });
    } catch (err) {
        console.error('🔴 Admin reset error:', err);
        res.status(500).json({ success: false, error: 'Failed to reset user password' });
    }
});

// ==================== ADMIN BILLING ENDPOINTS ====================

// GET billing data - FIXED to return ARRAY (fix for AdminBilling.js error)
app.get('/api/admin/billing', (req, res) => {
    console.log('💰 Admin billing data requested');
    
    // Calculate billing overview
    const totalAmount = billings.reduce((sum, bill) => sum + (bill.amount || 0), 0);
    const paidAmount = billings
        .filter(bill => bill.status === 'paid')
        .reduce((sum, bill) => sum + (bill.amount || 0), 0);
    const pendingAmount = billings
        .filter(bill => bill.status === 'pending')
        .reduce((sum, bill) => sum + (bill.amount || 0), 0);

    res.json({
        success: true,
        data: billings, // Now returns ARRAY instead of object
        overview: {
            total: totalAmount,
            paid: paidAmount,
            pending: pendingAmount
        },
        count: billings.length
    });
});

// UPDATE billing - NEW ENDPOINT
app.put('/api/admin/billing/:id', (req, res) => {
    console.log('✏️ Update billing request:', { id: req.params.id, body: req.body });
    
    try {
        const billingId = parseInt(req.params.id);
        const { amount, status, description, serviceType } = req.body;

        const billingIndex = billings.findIndex(b => b.id === billingId);
        if (billingIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Billing record not found'
            });
        }

        // Update billing
        if (amount !== undefined) billings[billingIndex].amount = parseFloat(amount);
        if (status) billings[billingIndex].status = status;
        if (description) billings[billingIndex].description = description;
        if (serviceType) billings[billingIndex].serviceType = serviceType;

        console.log('✅ Billing updated successfully:', { id: billingId });

        res.json({
            success: true,
            message: 'Billing record updated successfully',
            data: billings[billingIndex]
        });

    } catch (error) {
        console.error('❌ Error updating billing:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while updating billing'
        });
    }
});

// DELETE billing - NEW ENDPOINT
app.delete('/api/admin/billing/:id', (req, res) => {
    console.log('🗑️ Delete billing request:', req.params.id);
    
    try {
        const billingId = parseInt(req.params.id);

        const billingIndex = billings.findIndex(b => b.id === billingId);
        if (billingIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Billing record not found'
            });
        }

        // Remove billing from array
        const deletedBilling = billings.splice(billingIndex, 1)[0];

        console.log('✅ Billing deleted successfully:', { id: billingId });

        res.json({
            success: true,
            message: 'Billing record deleted successfully',
            data: { id: billingId }
        });

    } catch (error) {
        console.error('❌ Error deleting billing:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while deleting billing'
        });
    }
});

// ==================== ADMIN SETTINGS ENDPOINTS ====================

// GET settings - NEW ENDPOINT (fix for 404 error)
app.get('/api/admin/settings', (req, res) => {
    console.log('⚙️ Settings requested');
    
    res.json({
        success: true,
        data: settings
    });
});

// UPDATE settings - NEW ENDPOINT
app.put('/api/admin/settings', (req, res) => {
    console.log('✏️ Update settings request:', req.body);
    
    try {
        const newSettings = req.body;

        // Update settings
        Object.keys(newSettings).forEach(key => {
            if (settings[key] !== undefined) {
                settings[key] = newSettings[key];
            }
        });

        console.log('✅ Settings updated successfully');

        res.json({
            success: true,
            message: 'Settings updated successfully',
            data: settings
        });

    } catch (error) {
        console.error('❌ Error updating settings:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while updating settings'
        });
    }
});

// ==================== RECEPTION SPECIFIC ENDPOINTS ====================

// GET all patients for reception
app.get('/api/reception/patients', async (req, res) => {
    console.log('📋 Reception patients list requested');
    try {
        // Prefer DB-backed patients if available
        const patients = await UserModel.findAll({
            where: { role: 'patient' },
            include: [{ model: PatientModel, as: 'patient' }],
            attributes: ['id', 'email', 'name', 'phone', 'created_at']
        });

        const receptionPatients = patients.map(u => ({
            id: u.id,
            name: u.name || u.email,
            email: u.email,
            phone: u.phone || (u.patient && u.patient.emergency_contact_phone) || '',
            registeredDate: u.created_at || u.createdAt,
            status: u.is_active ? 'Active' : 'Inactive',
            insurance_provider: u.patient?.insurance_provider || null
        }));

        res.json({ success: true, data: receptionPatients, count: receptionPatients.length });
    } catch (error) {
        console.warn('DB query failed for reception patients, falling back to in-memory list', error.message);
        const receptionPatients = patients.map(patient => ({
            ...patient,
            status: 'Active',
            last_visit: patient.lastVisit,
            phone_number: patient.phone,
            address: '123 Main St, Addis Ababa',
            emergency_contact: '+251 91 123 4567',
            insurance_provider: 'Ethio Insurance',
            insurance_id: `INS${String(patient.id).padStart(6, '0')}`
        }));

        res.json({ success: true, data: receptionPatients, count: receptionPatients.length });
    }
});

// POST register new patient
app.post('/api/reception/register-patient', async (req, res) => {
    console.log('🆕 Register patient request:', req.body);
    
    try {
        const { name, email, phone, age, gender, address, emergencyContact, insuranceProvider, password } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Patient name is required' });
        }

        // Generate default email/phone if not provided
        const patientEmail = email || `patient${patients.length + 1}@clinic.com`;
        const patientPhone = phone || `+2519${String(patients.length + 1).padStart(8, '0')}`;

        // Check if patient already exists
        if (email) {
            const existingPatient = patients.find(p => p.email === email);
            if (existingPatient) {
                return res.status(400).json({ success: false, error: 'Patient with this email already exists' });
            }
        }

        // Create new patient
        const newPatient = {
            id: patients.length + 1,
            name,
            email: patientEmail,
            phone: patientPhone,
            age: age || null,
            gender: gender || 'Unknown',
            lastVisit: new Date().toISOString().split('T')[0],
            address: address || 'Not specified',
            emergencyContact: emergencyContact || 'Not specified',
            insuranceProvider: insuranceProvider || 'Not specified',
            status: 'Active',
            registeredDate: new Date().toISOString()
        };

        // Add to patients array
        patients.push(newPatient);

        // Also create a corresponding user for authentication so the patient can log in
        const existingUser = users.find(u => u.email === patientEmail);
        let generatedPassword = password;
        if (!generatedPassword) {
            generatedPassword = `P@ss${Math.floor(100000 + Math.random() * 900000)}`;
        }

        if (!existingUser) {
            const hashed = await bcrypt.hash(generatedPassword, 10);
            const newUser = {
                id: users.length + 1,
                email: patientEmail,
                password: hashed,
                name: name,
                role: 'patient',
                clinicId: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
                lastLogin: null
            };
            users.push(newUser);
            console.log('✅ Created user account for patient:', newUser.email);
        }

        console.log('✅ Patient registered successfully:', { name: newPatient.name, id: newPatient.id, email: newPatient.email, phone: newPatient.phone });

        res.status(201).json({ success: true, message: 'Patient registered successfully', data: newPatient, credentials: { email: patientEmail, password: generatedPassword } });

    } catch (error) {
        console.error('❌ Error registering patient:', error);
        res.status(500).json({ success: false, error: 'Internal server error while registering patient' });
    }
});

// GET scheduled appointments for reception
app.get('/api/reception/scheduled-appointments', (req, res) => {
    console.log('📅 Reception scheduled appointments requested');
    
    const scheduledAppointments = appointments
        .filter(appointment => appointment.status === 'scheduled' || appointment.status === 'pending')
        .map(appointment => ({
            ...appointment,
            appointment_id: `APT${String(appointment.id).padStart(6, '0')}`,
            duration: '30 mins',
            room: 'Exam Room ' + (appointment.id % 5 + 1),
            notes: appointment.type === 'Checkup' ? 'Routine checkup' : 'Consultation appointment'
        }));

    res.json({
        success: true,
        data: scheduledAppointments,
        count: scheduledAppointments.length,
        stats: {
            total: appointments.length,
            scheduled: appointments.filter(a => a.status === 'scheduled').length,
            pending: appointments.filter(a => a.status === 'pending').length,
            completed: appointments.filter(a => a.status === 'completed').length,
            today: appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length
        }
    });
});

// GET billing information for reception
app.get('/api/reception/billing', (req, res) => {
    console.log('💰 Reception billing data requested');
    
    const billingData = {
        overview: {
            totalRevenue: 12500,
            pendingPayments: 3200,
            collectedToday: 1800,
            monthlyTarget: 20000
        },
        pendingBills: [
            { id: 1, patientName: 'John Doe', amount: 150, dueDate: '2024-01-20', status: 'Pending', service: 'Consultation' },
            { id: 2, patientName: 'Alice Johnson', amount: 200, dueDate: '2024-01-18', status: 'Pending', service: 'Lab Tests' },
            { id: 3, patientName: 'Bob Smith', amount: 75, dueDate: '2024-01-22', status: 'Pending', service: 'Checkup' }
        ],
        recentTransactions: [
            { id: 1, patientName: 'Sarah Wilson', amount: 300, date: '2024-01-15', type: 'Payment', method: 'Cash' },
            { id: 2, patientName: 'Mike Brown', amount: 150, date: '2024-01-14', type: 'Payment', method: 'Card' },
            { id: 3, patientName: 'Emily Davis', amount: 250, date: '2024-01-13', type: 'Payment', method: 'Insurance' }
        ],
        billingStats: {
            cashPayments: 4500,
            cardPayments: 6000,
            insurancePayments: 2000,
            outstandingAmount: 3200
        }
    };

    res.json({
        success: true,
        data: billingData
    });
});

// NEW: Appointment requests endpoint
app.get('/api/reception/appointment-requests', (req, res) => {
    console.log('📋 Reception appointment requests requested');
    
    const appointmentRequests = [
        { id: 1, patientName: 'New Patient 1', requestedDate: '2024-01-17', type: 'Consultation', status: 'Pending', priority: 'Normal' },
        { id: 2, patientName: 'New Patient 2', requestedDate: '2024-01-16', type: 'Emergency', status: 'Pending', priority: 'High' }
    ];

    res.json({
        success: true,
        data: appointmentRequests,
        count: appointmentRequests.length
    });
});

// NEW: Available doctors endpoint (dynamic from in-memory users when DB is unavailable)
app.get('/api/reception/available-doctors', (req, res) => {
    console.log('👨‍⚕️ Available doctors requested');

    // Prefer using the in-memory users array for quick dev response
    const availableDoctors = (users || []).filter(u => (u.role === 'doctor' || u.role === 'doctor_user' || u.role === 'physician') && (u.isActive !== false)).map(u => {
        const displayName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || `Dr. ${u.id}`;
        return {
            id: u.id,
            name: displayName.startsWith('Dr') ? displayName : `Dr. ${displayName}`,
            specialization: u.specialization || 'General Physician',
            availableSlots: Math.max(0, Math.min(8, Math.floor((u.availableSlots || 3))))
        };
    });

    // If no registered doctors found, fall back to the default sample list
    if (availableDoctors.length === 0) {
        availableDoctors.push(
            { id: 1, name: 'Dr. Michael Brown', specialization: 'General Physician', availableSlots: 5 },
            { id: 2, name: 'Dr. Sarah Johnson', specialization: 'Cardiologist', availableSlots: 3 },
            { id: 3, name: 'Dr. James Wilson', specialization: 'Pediatrician', availableSlots: 7 }
        );
    }

    res.json({
        success: true,
        data: availableDoctors,
        count: availableDoctors.length
    });
});

// NEW: Patient queue endpoint
app.get('/api/reception/patient-queue', (req, res) => {
    console.log('🔄 Patient queue requested');
    
    const patientQueue = [
        { id: 1, patientName: 'John Doe', checkInTime: '09:00 AM', status: 'Waiting', doctor: 'Dr. Michael Brown' },
        { id: 2, patientName: 'Alice Johnson', checkInTime: '09:15 AM', status: 'In Consultation', doctor: 'Dr. Sarah Johnson' },
        { id: 3, patientName: 'Bob Smith', checkInTime: '09:30 AM', status: 'Waiting', doctor: 'Dr. Michael Brown' }
    ];

    res.json({
        success: true,
        data: patientQueue,
        count: patientQueue.length
    });
});

// POST create appointment for a patient (used by frontend schedule flows)
app.post('/api/appointments/patient', (req, res) => {
    console.log('📥 Create appointment (patient) received:', req.body);
    try {
        // delegate to helper to create appointment from body
        const newAppointment = createAppointmentFromBody(req.body);
        res.status(201).json({ success: true, message: 'Appointment created', data: newAppointment });
    } catch (error) {
        console.error('💥 Error creating appointment:', error);
        res.status(500).json({ success: false, error: 'Failed to create appointment' });
    }
});

// POST create scheduled appointment from reception UI (alternate path)
app.post('/api/reception/scheduled-appointments', (req, res) => {
    console.log('📥 Reception schedule appointment:', req.body);
    try {
        const newAppointment = createAppointmentFromBody(req.body);
        return res.status(201).json({ success: true, message: 'Appointment created', data: newAppointment });
    } catch (error) {
        console.error('💥 Error creating reception scheduled appointment:', error);
        return res.status(500).json({ success: false, error: 'Failed to create scheduled appointment' });
    }
});

// Helper: create appointment object from request body and store in memory
function createAppointmentFromBody(body) {
    const { patient_id, patientId, doctor_id, doctorId, appointment_date, appointmentDate, start_time, startTime, end_time, endTime, visit_type, visitType, reason, notes, status } = body || {};

    // Helper to normalize IDs that might be sent as role-prefixed strings like 'PAT000123' or 'DOC000123'
    const normalizeId = (val) => {
        if (val === null || typeof val === 'undefined') return null;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            // Extract trailing digits
            const digits = val.replace(/[^0-9]/g, '');
            const parsed = parseInt(digits, 10);
            return Number.isNaN(parsed) ? null : parsed;
        }
        return null;
    };

    const normalizedPatientId = normalizeId(patientId || patient_id);
    const normalizedDoctorId = normalizeId(doctorId || doctor_id);

    const newAppointment = {
        id: appointments.length + 1,
        patientId: normalizedPatientId,
        // allow direct patient name when id is not available (clients may send patientName/patient_name or patient object)
        patientName: (body.patientName || body.patient_name || (body.patient && (body.patient.name || body.patient.username)) || null),
        doctorId: normalizedDoctorId,
        // allow doctor name when id is not available
        doctorName: (body.doctorName || body.doctor_name || null),
        date: appointmentDate || appointment_date || new Date().toISOString().split('T')[0],
        time: startTime || start_time || '09:00',
        endTime: endTime || end_time || '10:00',
        status: status || 'scheduled',
        type: visitType || visit_type || 'General',
        reason: reason || '',
        notes: notes || ''
    };

    // populate name fields if patient exists
    const patient = patients.find(p => p.id === newAppointment.patientId || p.patientId === newAppointment.patientId);
    if (patient) {
        newAppointment.patientName = patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
        // attach patient object for frontend convenience
        newAppointment.patient = {
            id: patient.id,
            name: patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
            email: patient.email,
            phone: patient.phone,
            first_name: patient.first_name,
            last_name: patient.last_name
        };
    } else if (newAppointment.patientName) {
        // If a patient name was provided without an id, attach a minimal patient object for frontend display
        newAppointment.patient = {
            id: null,
            name: newAppointment.patientName
        };
    }

    // If no doctor specified, assign to default doctor id (2) so doctor endpoints can pick it up
    if (!newAppointment.doctorId) {
        newAppointment.doctorId = 2;
    }

    const doctor = users.find(u => u.id === newAppointment.doctorId);
    if (doctor) {
        newAppointment.doctorName = doctor.name || doctor.first_name;
        newAppointment.doctor = {
            id: doctor.id,
            name: doctor.name || doctor.first_name,
            email: doctor.email
        };
    }

    appointments.push(newAppointment);
    return newAppointment;
}

// GET appointments for a patient
app.get('/api/appointments/patient', (req, res) => {
    console.log('🔎 Get patient appointments requested, query:', req.query);
    const patientId = parseInt(req.query.patientId) || parseInt(req.query.patient_id) || null;
    if (!patientId) {
        // return all as fallback
        return res.json({ success: true, data: appointments });
    }
    const patientAppointments = appointments.filter(a => a.patientId === patientId || a.patient_id === patientId);
    res.json({ success: true, data: patientAppointments });
});

// GET doctor's appointments for today
app.get('/api/doctor/appointments/today', (req, res) => {
    console.log('👨‍⚕️ Doctor today appointments requested, query:', req.query);
    (async () => {
        try {
            const doctorId = parseInt(req.query.doctorId) || parseInt(req.query.doctor_id) || 2;
            const today = new Date().toISOString().split('T')[0];

            // Use DB model when available
            const appts = await AppointmentModel.findAll({
                where: { appointmentDate: today },
                include: [
                    { model: UserModel, as: 'patient', attributes: ['id', 'name', 'email'] },
                    { model: UserModel, as: 'doctor', attributes: ['id', 'name', 'email'] }
                ]
            });

            // Filter by doctor if provided
            const filtered = appts.filter(a => !doctorId || a.doctorId === doctorId || a.doctor_id === doctorId);
            res.json({ success: true, data: filtered });
        } catch (error) {
            console.warn('DB query failed for todays appointments, falling back to memory', error.message);
            const doctorId = parseInt(req.query.doctorId) || parseInt(req.query.doctor_id) || 2;
            const today = new Date().toISOString().split('T')[0];
            const todays = appointments.filter(a => {
                const apptDoctorId = (typeof a.doctorId === 'string') ? parseInt(a.doctorId.replace(/[^0-9]/g, ''), 10) : a.doctorId;
                return (apptDoctorId === doctorId || a.doctor_id === doctorId) && a.date === today;
            });
            res.json({ success: true, data: todays });
        }
    })();
});

// GET search patients for doctor (simple q param)
app.get('/api/doctor/patients/search', (req, res) => {
    (async () => {
        try {
            const q = (req.query.q || '').toLowerCase();
            const where = q ? {
                role: 'patient',
                // simple search across name/email
            } : { role: 'patient' };

            // Use raw query via UserModel to search name/email/id
            const users = await UserModel.findAll({
                where: where,
                attributes: ['id', 'name', 'email'],
                limit: 50
            });

            // Apply client-side filter for q if present
            const filtered = users.filter(u => {
                if (!q) return true;
                const name = (u.name || '').toLowerCase();
                return name.includes(q) || (u.email || '').toLowerCase().includes(q) || String(u.id) === q;
            }).slice(0, 50);

            res.json({ success: true, data: filtered });
        } catch (error) {
            console.warn('DB search failed for patients, falling back to memory', error.message);
            const q = (req.query.q || '').toLowerCase();
            const results = patients.filter(p => {
                const name = (p.name || `${p.first_name || ''} ${p.last_name || ''}`).toLowerCase();
                return !q || name.includes(q) || (p.email || '').toLowerCase().includes(q) || String(p.id) === q;
            }).slice(0, 50);
            res.json({ success: true, data: results });
        }
    })();
});

// GET doctor lab endpoints (mocked)
app.get('/api/doctor/lab-requests', (req, res) => {
    res.json({ success: true, data: labRequests });
});

app.get('/api/doctor/lab-results', (req, res) => {
    console.log('🔎 /api/doctor/lab-results (legacy) requested');
    try {
        const enriched = labResults.map(r => {
            const patient = (typeof r.patient === 'object' && r.patient) || patients.find(p => p.id === r.patientId) || users.find(u => u.id === r.patientId) || null;
            const technician = (typeof r.technician === 'object' && r.technician) || (r.technicianId ? users.find(u => u.id === r.technicianId) : null);
            const reqItem = labRequests.find(lr => lr.id === r.labRequestId) || null;
            const reqPatient = reqItem ? ((typeof reqItem.patient === 'object' && reqItem.patient) || patients.find(p => p.id === reqItem.patientId) || users.find(u => u.id === reqItem.patientId) || null) : null;
            const reqDoctor = reqItem ? ((typeof reqItem.doctor === 'object' && reqItem.doctor) || (reqItem.doctorId ? users.find(u => u.id === reqItem.doctorId) : null)) : null;
            const reqTechnician = reqItem ? ((typeof reqItem.technician === 'object' && reqItem.technician) || (reqItem.technicianId ? users.find(u => u.id === reqItem.technicianId) : null)) : null;
            const enrichedReq = reqItem ? {
                ...reqItem,
                patient: reqPatient ? { id: reqPatient.id, username: reqPatient.username || reqPatient.name || (reqPatient.email && reqPatient.email.split('@')?.[0]), name: reqPatient.name || `${reqPatient.first_name || ''} ${reqPatient.last_name || ''}`.trim() } : null,
                doctor: reqDoctor ? { id: reqDoctor.id, username: reqDoctor.username || reqDoctor.name || (reqDoctor.email && reqDoctor.email.split('@')?.[0]), name: reqDoctor.name || `${reqDoctor.first_name || ''} ${reqDoctor.last_name || ''}`.trim() } : null,
                technician: reqTechnician ? { id: reqTechnician.id, username: reqTechnician.username || reqTechnician.name || (reqTechnician.email && reqTechnician.email.split('@')?.[0]), name: reqTechnician.name || `${reqTechnician.first_name || ''} ${reqTechnician.last_name || ''}`.trim() } : null
            } : null;

            return {
                ...r,
                labRequest: enrichedReq,
                patient: patient ? { id: patient.id, username: patient.username || patient.name || (patient.email && patient.email.split('@')?.[0]), name: patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() } : null,
                technician: technician ? { id: technician.id, username: technician.username || technician.name || (technician.email && technician.email.split('@')?.[0]), name: technician.name || `${technician.first_name || ''} ${technician.last_name || ''}`.trim() } : null
            };
        });
        return res.json({ success: true, labResults: enriched, count: enriched.length });
    } catch (err) {
        console.error('Error enriching legacy doctor lab-results:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch lab results' });
    }
});

app.get('/api/doctor/lab-technicians', (req, res) => {
    // return mock lab technician users from users array
    const techs = users.filter(u => u.role === 'lab_technician').map(u => ({ id: u.id, name: u.name || u.first_name }));
    res.json({ success: true, data: techs });
});

// Allow doctors to create lab requests (persist to in-memory store)
app.post('/api/doctor/lab-requests', (req, res) => {
    try {
        const body = req.body || {};
        const nextId = labRequests.length ? Math.max(...labRequests.map(r => r.id)) + 1 : 1;
        // Determine doctor id (support body fields or default to sample doctor for mock)
        const determinedDoctorId = body.doctorId || body.doctor_id || (req.user && req.user.id) || 2;
        const newRequest = {
            id: nextId,
            patientId: body.patientId || body.patient_id || null,
            doctorId: determinedDoctorId,
            technicianId: body.technicianId || body.technician_id || null,
            testType: body.testType || body.test_type || body.test || 'Unknown Test',
            urgency: body.urgency || 'normal',
            notes: body.notes || '',
            status: body.status || 'pending',
            dateRequested: new Date().toISOString(),
            // Include a lightweight doctor object when available to help front-end
            doctor: (() => {
                const d = users.find(u => u.id === determinedDoctorId);
                if (!d) return null;
                return { id: d.id, username: d.username || d.email?.split('@')?.[0], name: d.name || `${d.first_name || ''} ${d.last_name || ''}`.trim() };
            })()
        };

        labRequests.push(newRequest);
        console.log('➕ New lab request created by doctor:', newRequest);
        return res.status(201).json({ success: true, data: newRequest });
    } catch (err) {
        console.error('❌ Failed to create lab request:', err);
        return res.status(500).json({ success: false, error: 'Failed to create lab request' });
    }
});

app.get('/api/doctor/prescriptions', (req, res) => {
    // return some mock prescriptions
    const prescriptions = [
        { id: 1, patientId: 1, doctorId: 2, medication: 'Amoxicillin', dosage: '500mg', frequency: '3 times daily' }
    ];
    res.json({ success: true, data: prescriptions });
});

app.get('/api/doctor/medical-notes', (req, res) => {
    // Combine static notes with in-memory medicalRecords so doctor sees entries created during runtime
    const staticNotes = [
        { id: 1, patientId: 1, doctorId: 2, note: 'Follow up in 2 weeks', date: '2024-01-15' }
    ];
    const dynamicNotes = medicalRecords.map(m => ({ id: m.id, patientId: m.patientId, doctorId: m.doctorId, note: m.note || m.content || m.description || '', date: m.date || m.createdAt }));
    const combined = [...dynamicNotes, ...staticNotes];
    res.json({ success: true, data: combined });
});

// Allow doctors to add medical notes (store in-memory so patients can see them)
app.post('/api/doctor/medical-notes', (req, res) => {
    console.log('📥 Doctor creating medical note:', req.body);
    try {
        const { patientId, doctorId, content, note, noteType, diagnosis } = req.body || {};
        const pid = parseInt(patientId) || null;
        const did = parseInt(doctorId) || 2; // default doctor id for dev

        if (!pid) {
            return res.status(400).json({ success: false, error: 'patientId is required' });
        }

        const docUser = users.find(u => u.id === did) || null;
        const newNote = {
            id: medicalRecords.length + 1,
            patientId: pid,
            doctorId: did,
            doctor: docUser ? { id: docUser.id, name: docUser.name || `${docUser.first_name || ''} ${docUser.last_name || ''}`.trim(), username: docUser.username || docUser.email } : null,
            note: content || note || '',
            noteType: noteType || 'note',
            diagnosis: diagnosis || null,
            date: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        medicalRecords.unshift(newNote); // add to front so recent notes appear first

        res.status(201).json({ success: true, message: 'Medical note created', data: newNote });
    } catch (err) {
        console.error('Error creating medical note (in-memory):', err);
        res.status(500).json({ success: false, error: 'Failed to create medical note' });
    }
});

// ==================== ADMIN STATS ENDPOINTS ====================

app.get('/api/admin/overview', (req, res) => {
    console.log('📊 Admin overview data requested');
    res.json({
        success: true,
        data: {
            activePatients: users.filter(u => u.role === 'patient' && u.isActive).length,
            totalUsers: users.length,
            staffMembers: users.filter(u => u.role !== 'patient').length,
            monthlyRevenue: 12500,
            recentActivity: [
                { id: 1, action: 'New patient registered', time: '2 hours ago', user: 'John Doe' },
                { id: 2, action: 'Appointment completed', time: '4 hours ago', user: 'Dr. Smith' },
                { id: 3, action: 'Lab test results added', time: '6 hours ago', user: 'Lab Tech' },
                { id: 4, action: 'Payment received', time: '1 day ago', user: 'Sarah Wilson' },
                { id: 5, action: 'New doctor joined', time: '2 days ago', user: 'Dr. Johnson' }
            ]
        }
    });
});

// Users stats endpoint
app.get('/api/admin/users/stats', (req, res) => {
    console.log('📈 Users stats requested');
    
    const userStats = {
        total: users.length,
        patients: users.filter(u => u.role === 'patient').length,
        doctors: users.filter(u => u.role === 'doctor').length,
        receptionists: users.filter(u => u.role === 'receptionist').length,
        labTechnicians: users.filter(u => u.role === 'lab_technician').length,
        admins: users.filter(u => u.role === 'admin').length,
        growth: 12,
        activeToday: users.filter(u => u.lastLogin && new Date(u.lastLogin).toDateString() === new Date().toDateString()).length
    };
    
    res.json({
        success: true,
        data: userStats
    });
});

// Billing stats endpoint
app.get('/api/admin/billing/stats', (req, res) => {
    console.log('💰 Billing stats requested');
    
    const completedAppointments = appointments.filter(a => a.status === 'completed').length;
    const pendingAppointments = appointments.filter(a => a.status === 'pending').length;
    
    res.json({
        success: true,
        data: {
            monthlyRevenue: 12500 + (users.filter(u => u.role === 'patient').length * 10),
            pendingPayments: pendingAppointments * 150,
            completedPayments: completedAppointments * 150,
            revenueGrowth: 15,
            averageTransaction: 150
        }
    });
});

// Additional stats endpoint
app.get('/api/admin/stats', (req, res) => {
    console.log('📊 General admin stats requested');
    res.json({
        success: true,
        data: {
            appointments: appointments.length,
            patients: users.filter(u => u.role === 'patient').length,
            revenue: 12500,
            pendingTasks: 12,
            weeklyGrowth: 8
        }
    });
});

// ==================== ROLE-SPECIFIC DASHBOARD ENDPOINTS ====================

// Admin Dashboard
app.get('/api/admin/dashboard', (req, res) => {
    console.log('📊 Admin dashboard requested');
    
    const totalPatients = users.filter(u => u.role === 'patient').length;
    const totalDoctors = users.filter(u => u.role === 'doctor').length;
    const totalReceptionists = users.filter(u => u.role === 'receptionist').length;
    const totalLabTechs = users.filter(u => u.role === 'lab_technician').length;
    const totalAdmins = users.filter(u => u.role === 'admin').length;
    
    const todayAppointments = appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length;
    const completedAppointments = appointments.filter(a => a.status === 'completed').length;
    const pendingAppointments = appointments.filter(a => a.status === 'pending').length;
    
    const todayRevenue = completedAppointments * 150;
    const monthlyRevenue = 12500 + (totalPatients * 10);
    const pendingRevenue = pendingAppointments * 150;

    const recentUsers = [...users]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(user => {
            const { password, ...userWithoutPassword } = user;
            return {
                ...userWithoutPassword,
                role_specific_id: generateRoleSpecificId(user.id, user.role)
            };
        });

    const recentActivity = users.slice(-3).map(user => ({
        id: user.id,
        action: `New ${user.role} ${user.role === 'patient' ? 'registered' : 'added'}`,
        user: user.name,
        time: formatTimeAgo(user.createdAt),
        type: 'user'
    }));

    res.json({
        success: true,
        data: {
            summary: {
                totalUsers: users.length,
                totalPatients: totalPatients,
                totalDoctors: totalDoctors,
                totalStaff: totalDoctors + totalReceptionists + totalLabTechs + totalAdmins,
                monthlyRevenue: monthlyRevenue,
                activePatients: users.filter(u => u.role === 'patient' && u.isActive).length,
                todayRevenue: todayRevenue,
                pendingRevenue: pendingRevenue
            },
            recentActivity: recentActivity,
            userStats: {
                byRole: {
                    patients: totalPatients,
                    doctors: totalDoctors,
                    receptionists: totalReceptionists,
                    lab_technicians: totalLabTechs,
                    admins: totalAdmins
                },
                growth: 12,
                activeToday: users.filter(u => u.lastLogin && new Date(u.lastLogin).toDateString() === new Date().toDateString()).length
            },
            appointmentStats: {
                total: appointments.length,
                today: todayAppointments,
                completed: completedAppointments,
                pending: pendingAppointments,
                scheduled: appointments.filter(a => a.status === 'scheduled').length
            },
            recentUsers: recentUsers,
            quickStats: {
                appointmentsToday: todayAppointments,
                completedThisMonth: completedAppointments,
                pendingRevenue: pendingRevenue,
                scheduledAppointments: appointments.filter(a => a.status === 'scheduled').length,
                todayRevenue: todayRevenue
            }
        }
    });
});

// Doctor Dashboard
app.get('/api/doctor/dashboard', (req, res) => {
    console.log('👨‍⚕️ Doctor dashboard requested');
    
    const doctorId = 2;
    const doctorAppointments = appointments.filter(a => a.doctorId === doctorId);
    const today = new Date().toISOString().split('T')[0];

    res.json({
        success: true,
        data: {
            todayAppointments: doctorAppointments.filter(a => a.date === today).length,
            totalPatients: patients.length,
            prescriptions: 23,
            availableSlots: 15,
            myAppointments: doctorAppointments,
            patientQueue: patients.slice(0, 3),
            todaySchedule: doctorAppointments.filter(a => a.date === today),
            stats: {
                completedAppointments: doctorAppointments.filter(a => a.status === 'completed').length,
                pendingConsultations: doctorAppointments.filter(a => a.status === 'pending').length,
                monthlyEarnings: 8500,
                patientSatisfaction: 95
            }
        }
    });
});

// GET doctor stats (alternate endpoint expected by frontend)
app.get('/api/doctor/stats', (req, res) => {
    console.log('👨‍⚕️ Doctor stats requested');
    const doctorId = parseInt(req.query.doctorId) || 2;
    const doctorAppointments = appointments.filter(a => a.doctorId === doctorId || a.doctor_id === doctorId);

    const stats = {
        completedAppointments: doctorAppointments.filter(a => a.status === 'completed').length,
        pendingConsultations: doctorAppointments.filter(a => a.status === 'pending' || a.status === 'waiting').length,
        monthlyEarnings: 8500,
        patientSatisfaction: 95
    };

    res.json({ success: true, data: { stats } });
});

// Patient Dashboard
app.get('/api/patient/dashboard', (req, res) => {
    console.log('😷 Patient dashboard requested');
    
    const patientId = 1;
    const patientAppointments = appointments.filter(a => a.patientId === patientId);

    res.json({
        success: true,
        data: {
            upcomingAppointments: patientAppointments.filter(a => a.status === 'scheduled' || a.status === 'pending'),
            prescriptions: [
                { id: 1, name: 'Amoxicillin', dosage: '500mg', frequency: '3 times daily', endDate: '2024-01-25' },
                { id: 2, name: 'Vitamin D', dosage: '1000IU', frequency: 'Once daily', endDate: '2024-02-15' }
            ],
            labResults: [
                { id: 1, testName: 'Blood Test', date: '2024-01-10', status: 'Completed', result: 'Normal' },
                { id: 2, testName: 'X-Ray Chest', date: '2024-01-12', status: 'Completed', result: 'Clear' }
            ],
            bills: [
                { id: 1, amount: 150, dueDate: '2024-01-20', status: 'Pending' }
            ],
            medicalHistory: patientAppointments.filter(a => a.status === 'completed'),
            stats: {
                totalVisits: patientAppointments.filter(a => a.status === 'completed').length,
                upcomingVisits: patientAppointments.filter(a => a.status === 'scheduled').length,
                pendingPayments: 150,
                healthScore: 88
            }
        }
    });
});

// Receptionist Dashboard
app.get('/api/reception/dashboard', (req, res) => {
    console.log('💁 Receptionist dashboard requested');
    
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(a => a.date === today);

    // Enrich appointments that may lack patient/doctor names (some test data or incoming payloads omit these fields)
    const enrichedTodayAppointments = todayAppointments.map(a => {
        const appt = { ...a };
        if (!appt.patientName) {
            const patient = patients.find(p => p.id === appt.patientId || p.patientId === appt.patientId);
            if (patient) {
                appt.patientName = patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
                appt.patient = {
                    id: patient.id,
                    name: patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
                    email: patient.email,
                    phone: patient.phone
                };
            } else if (appt.patient && appt.patient.name) {
                appt.patientName = appt.patient.name;
            }
        }
        if (!appt.doctorName) {
            const doctor = users.find(u => u.id === appt.doctorId || u.doctor_id === appt.doctorId);
            if (doctor) {
                appt.doctorName = doctor.name || doctor.first_name || `Dr. ${doctor.id}`;
                appt.doctor = { id: doctor.id, name: appt.doctorName, email: doctor.email };
            }
        }
        return appt;
    });

    res.json({
        success: true,
        data: {
            checkins: enrichedTodayAppointments.filter(a => a.status === 'completed').length,
            appointments: appointments.length,
            newPatients: patients.filter(p => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(p.lastVisit) >= weekAgo;
            }).length,
            pendingPayments: 8,
            todayAppointments: enrichedTodayAppointments,
            waitingPatients: patients.slice(0, 3),
            upcomingBookings: appointments
                .filter(a => new Date(a.date) >= new Date())
                .slice(0, 5),
            stats: {
                scheduledToday: enrichedTodayAppointments.length,
                checkedIn: enrichedTodayAppointments.filter(a => a.status === 'completed').length,
                noShows: 2,
                revenueCollected: 3200,
                registrationQueue: 3
            }
        }
    });
});

// Lab Technician Dashboard
app.get('/api/lab/dashboard', (req, res) => {
    console.log('🔬 Lab technician dashboard requested');
    
    const pendingTests = [
        { id: 1, patientName: 'John Doe', testType: 'Blood Test', priority: 'High', status: 'Pending', requestedDate: '2024-01-15' },
        { id: 2, patientName: 'Alice Johnson', testType: 'Urine Analysis', priority: 'Normal', status: 'In Progress', requestedDate: '2024-01-15' },
        { id: 3, patientName: 'Bob Smith', testType: 'X-Ray', priority: 'High', status: 'Pending', requestedDate: '2024-01-14' }
    ];

    res.json({
        success: true,
        data: {
            pendingTests: pendingTests.length,
            completedTests: 45,
            todayTests: pendingTests.filter(t => t.requestedDate === new Date().toISOString().split('T')[0]).length,
            criticalResults: 2,
            testQueue: pendingTests,
            recentResults: [
                { id: 4, patientName: 'Sarah Wilson', testType: 'MRI', status: 'Completed', result: 'Normal' },
                { id: 5, patientName: 'Mike Brown', testType: 'CT Scan', status: 'Completed', result: 'Review Needed' }
            ],
            stats: {
                testsThisWeek: 34,
                averageProcessingTime: '2.5 hours',
                criticalAlerts: 2,
                equipmentStatus: 'All Operational',
                completionRate: 92
            }
        }
    });
});

// ==================== SYSTEM ENDPOINTS ====================

app.get('/api/system/data', (req, res) => {
    console.log('🖥️ System data requested');
    res.json({
        success: true,
        data: {
            stats: {
                patients: users.filter(u => u.role === 'patient').length,
                appointments: appointments.length,
                revenue: 12500,
                staff: users.filter(u => u.role !== 'patient').length
            },
            charts: {
                monthlyRevenue: [10000, 12000, 11000, 12500],
                patientGrowth: [30, 35, 42, 45, 50, users.filter(u => u.role === 'patient').length],
                appointmentTypes: { 'Checkup': 45, 'Consultation': 67, 'Emergency': 23, 'Follow-up': 21 }
            }
        }
    });
});

app.get('/api/activity/recent', (req, res) => {
    console.log('📝 Recent activity requested');
    
    const userActivities = users.slice(-5).map((user, index) => ({
        id: index + 1,
        type: 'user',
        action: `New ${user.role} ${user.role === 'patient' ? 'registered' : 'added'}`,
        user: user.name,
        time: formatTimeAgo(user.createdAt)
    }));

    res.json({
        success: true,
        data: userActivities.length > 0 ? userActivities : [
            { id: 1, type: 'user', action: 'New patient registered', user: 'John Doe', time: '2 hours ago' },
            { id: 2, type: 'appointment', action: 'Appointment completed', user: 'Dr. Smith', time: '4 hours ago' },
            { id: 3, type: 'lab', action: 'Lab results added', user: 'Lab Technician', time: '6 hours ago' }
        ]
    });
});

// ==================== DASHBOARD ENDPOINTS ====================

app.get('/api/dashboard/:role', (req, res) => {
    const { role } = req.params;
    console.log(`📋 Dashboard data requested for: ${role}`);
    
    const dashboardData = {
        admin: {
            appointments: appointments.length,
            patients: users.filter(u => u.role === 'patient').length,
            revenue: 12500,
            pendingTasks: 12,
            stats: {
                activePatients: users.filter(u => u.role === 'patient' && u.isActive).length,
                totalUsers: users.length,
                staffMembers: users.filter(u => u.role !== 'patient').length,
                monthlyRevenue: 12500
            }
        },
        doctor: {
            todayAppointments: 8,
            totalPatients: 89,
            prescriptions: 23,
            availableSlots: 15
        },
        patient: {
            upcomingAppointments: 2,
            prescriptions: 5,
            labResults: 3,
            bills: 1
        },
        receptionist: {
            checkins: 25,
            appointments: 18,
            newPatients: 4,
            pendingPayments: 8
        },
        lab_technician: {
            pendingTests: 12,
            completedTests: 45,
            todayTests: 7,
            criticalResults: 2
        }
    };

    const data = dashboardData[role] || dashboardData.admin;
    res.json({
        success: true,
        data: data
    });
});

// Ensure patient appointment request routes are available for older clients
app.get('/api/patient/appointment-requests', (req, res) => {
    console.log('📥 Get patient appointment requests, query:', req.query);
    const patientId = parseInt(req.query.patientId) || parseInt(req.query.patient_id) || 1;
    const results = appointmentRequests.filter(r => r.patientId === patientId);
    return res.json({ success: true, data: results, count: results.length });
});

app.post('/api/patient/appointment-requests', (req, res) => {
    console.log('📨 New patient appointment request received:', req.body);
    try {
        const { preferredDate, preferredTimeSlot, visitType, urgency, symptoms, preferredDoctorId, notes, patientId, patient_id } = req.body || {};
        const pid = parseInt(patientId) || parseInt(patient_id) || 1;
        const newReq = {
            id: appointmentRequests.length + 1,
            patientId: pid,
            preferred_date: preferredDate || new Date().toISOString().split('T')[0],
            preferred_time_slot: preferredTimeSlot || 'morning',
            visit_type: visitType || 'consultation',
            urgency: urgency || 'normal',
            symptoms: symptoms || '',
            preferred_doctor_id: preferredDoctorId || null,
            notes: notes || '',
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        appointmentRequests.push(newReq);
        return res.status(201).json({ success: true, message: 'Appointment request created', data: newReq });
    } catch (error) {
        console.error('Error creating appointment request:', error);
        return res.status(500).json({ success: false, error: 'Failed to create appointment request' });
    }
});

app.put('/api/patient/appointment-requests/:requestId/cancel', (req, res) => {
    const id = parseInt(req.params.requestId);
    const idx = appointmentRequests.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Appointment request not found' });
    appointmentRequests[idx].status = 'cancelled';
    return res.json({ success: true, message: 'Appointment request cancelled', data: appointmentRequests[idx] });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🚀 Clinic Management Server Started Successfully!');
    console.log('='.repeat(60));
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log('');
    console.log('✅ FIXED ADMIN CRUD ENDPOINTS:');
    console.log('   PUT    /api/admin/users/:id');
    console.log('   DELETE /api/admin/users/:id');
    console.log('   PUT    /api/admin/billing/:id');
    console.log('   DELETE /api/admin/billing/:id');
    console.log('   GET    /api/admin/settings');
    console.log('   PUT    /api/admin/settings');
    console.log('');
    console.log('📋 Available Endpoints:');
    console.log('   GET  /api/health');
    console.log('   GET  /api/test');
    console.log('   POST /api/auth/login');
    console.log('   GET  /api/admin/overview');
    console.log('   GET  /api/admin/users/stats');
    console.log('   GET  /api/admin/billing/stats');
    console.log('   GET  /api/admin/stats');
    console.log('   GET  /api/admin/users');
    console.log('   POST /api/admin/users');
    console.log('   PUT  /api/admin/users/:id');
    console.log('   DELETE /api/admin/users/:id');
    console.log('   GET  /api/admin/billing');
    console.log('   PUT  /api/admin/billing/:id');
    console.log('   DELETE /api/admin/billing/:id');
    console.log('   GET  /api/admin/settings');
    console.log('   PUT  /api/admin/settings');
    console.log('   GET  /api/system/data');
    console.log('   GET  /api/activity/recent');
    console.log('   GET  /api/dashboard/:role');
    console.log('   GET  /api/admin/dashboard');
    console.log('   GET  /api/doctor/dashboard');
    console.log('   GET  /api/patient/dashboard');
    console.log('   GET  /api/reception/dashboard');
    console.log('   GET  /api/lab/dashboard');
    console.log('   GET  /api/reception/patients');
    console.log('   POST /api/reception/register-patient');
    console.log('   GET  /api/reception/scheduled-appointments');
    console.log('   GET  /api/reception/billing');
    console.log('   GET  /api/reception/appointment-requests');
    console.log('   GET  /api/reception/available-doctors');
    console.log('   GET  /api/reception/patient-queue');
    console.log('='.repeat(60));
});

// Update appointment status (generic)
app.put('/api/appointments/:id/status', (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const idx = appointments.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Appointment not found' });
    appointments[idx].status = status || appointments[idx].status;
    res.json({ success: true, message: 'Appointment status updated', data: appointments[idx] });
});

// Doctor endpoint to update status
app.put('/api/doctor/appointments/:id/status', (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const idx = appointments.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Appointment not found' });
    appointments[idx].status = status || appointments[idx].status;
    res.json({ success: true, message: 'Doctor appointment status updated', data: appointments[idx] });
});

// Doctor complete appointment
app.post('/api/doctor/appointments/:id/complete', (req, res) => {
    const id = parseInt(req.params.id);
    const { diagnosis, treatmentNotes } = req.body;
    const idx = appointments.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Appointment not found' });
    appointments[idx].status = 'completed';
    appointments[idx].completedAt = new Date().toISOString();
    appointments[idx].diagnosis = diagnosis || '';
    appointments[idx].treatmentNotes = treatmentNotes || '';
    res.json({ success: true, message: 'Appointment completed', data: appointments[idx] });
});

// Create billing (reception)
app.post('/api/reception/billing', (req, res) => {
    try {
        const { patientId, patientName, amount, serviceType, description } = req.body;
        const newBilling = {
            id: billings.length + 1,
            patientId: patientId || null,
            patientName: patientName || null,
            amount: parseFloat(amount) || 0,
            status: 'pending',
            date: new Date().toISOString().split('T')[0],
            serviceType: serviceType || 'Consultation',
            invoiceNumber: `INV-${String(billings.length + 1).padStart(3, '0')}`,
            description: description || ''
        };
        billings.push(newBilling);
        res.status(201).json({ success: true, message: 'Billing created', data: newBilling });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to create billing' });
    }
});

// Update billing (e.g., mark paid)
app.put('/api/reception/billing/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status, paidAmount, method } = req.body;
        const idx = billings.findIndex(b => b.id === id);
        if (idx === -1) return res.status(404).json({ success: false, error: 'Billing not found' });
        if (status) billings[idx].status = status;
        if (paidAmount !== undefined) billings[idx].paidAmount = paidAmount;
        if (method) billings[idx].paymentMethod = method;
        if (status === 'paid') billings[idx].paidAt = new Date().toISOString();
        res.json({ success: true, message: 'Billing updated', data: billings[idx] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update billing' });
    }
});

// POST create patient (alternate route used by some frontend flows)
app.post('/api/reception/patients', async (req, res) => {
    console.log('🆕 Create patient (alternate) request:', req.body);
    try {
        // Reuse the same validation/creation logic as /register-patient
        const { name, email, phone, age, gender, address, emergencyContact, insuranceProvider, password } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Patient name is required' });
        }

        const patientEmail = email || `patient${patients.length + 1}@clinic.com`;
        const patientPhone = phone || `+2519${String(patients.length + 1).padStart(8, '0')}`;

        if (email) {
            const existingPatient = patients.find(p => p.email === email);
            if (existingPatient) {
                return res.status(400).json({ success: false, error: 'Patient with this email already exists' });
            }
        }

        const newPatient = {
            id: patients.length + 1,
            name,
            email: patientEmail,
            phone: patientPhone,
            age: age || null,
            gender: gender || 'Unknown',
            lastVisit: new Date().toISOString().split('T')[0],
            address: address || 'Not specified',
            emergencyContact: emergencyContact || 'Not specified',
            insuranceProvider: insuranceProvider || 'Not specified',
            status: 'Active',
            registeredDate: new Date().toISOString()
        };

        patients.push(newPatient);

        // Also create user account for login
        const existingUser = users.find(u => u.email === patientEmail);
        let generatedPassword = password;
        if (!generatedPassword) {
            generatedPassword = `P@ss${Math.floor(100000 + Math.random() * 900000)}`;
        }

        if (!existingUser) {
            const hashed = await bcrypt.hash(generatedPassword, 10);
            const newUser = {
                id: users.length + 1,
                email: patientEmail,
                password: hashed,
                name: name,
                role: 'patient',
                clinicId: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
                lastLogin: null
            };
            users.push(newUser);
            console.log('✅ Created user account for patient (alternate):', newUser.email);
        }

        console.log('✅ Patient created via /api/reception/patients:', { id: newPatient.id, name: newPatient.name });

        return res.status(201).json({ success: true, message: 'Patient created successfully', data: newPatient, credentials: { email: patientEmail, password: generatedPassword } });
    } catch (error) {
        console.error('❌ Error creating patient (alternate):', error);
        return res.status(500).json({ success: false, error: 'Internal server error while creating patient' });
    }
});

// DEBUG: Reset a user's password (development helper)
// This endpoint will update the DB user if available, otherwise it will update the in-memory users array.
app.post('/api/debug/reset-user-password', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'email and password are required' });
        }

        // Try DB first
        try {
            const dbUser = await UserModel.findOne({ where: { email } });
            if (dbUser) {
                // Update password_hash with plain password; model hook will hash it
                await dbUser.update({ password_hash: password });
                console.log('🔧 Reset password for DB user:', email);
                return res.json({ success: true, message: 'Password reset for DB user' });
            }
        } catch (dbErr) {
            console.warn('DB update failed during password reset:', dbErr.message);
        }

        // Fallback to in-memory users
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const hashed = await bcrypt.hash(password, 10);
        user.password = hashed;
        console.log('🔧 Reset password for in-memory user:', email);
        return res.json({ success: true, message: 'Password reset for in-memory user' });

    } catch (error) {
        console.error('Error in debug reset-user-password:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Patient appointment requests endpoints (used by patient UI)
app.get('/api/patient/appointment-requests', (req, res) => {
    console.log('📥 Get patient appointment requests, query:', req.query);
    const patientId = parseInt(req.query.patientId) || parseInt(req.query.patient_id) || 1;
    const results = appointmentRequests.filter(r => r.patientId === patientId);
    return res.json({ success: true, data: results, count: results.length });
});

app.post('/api/patient/appointment-requests', (req, res) => {
    console.log('📨 New patient appointment request received:', req.body);
    try {
        const { preferredDate, preferredTimeSlot, visitType, urgency, symptoms, preferredDoctorId, notes, patientId, patient_id } = req.body || {};
        const pid = parseInt(patientId) || parseInt(patient_id) || 1;
        const newReq = {
            id: appointmentRequests.length + 1,
            patientId: pid,
            preferred_date: preferredDate || new Date().toISOString().split('T')[0],
            preferred_time_slot: preferredTimeSlot || 'morning',
            visit_type: visitType || 'consultation',
            urgency: urgency || 'normal',
            symptoms: symptoms || '',
            preferred_doctor_id: preferredDoctorId || null,
            notes: notes || '',
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        appointmentRequests.push(newReq);
        return res.status(201).json({ success: true, message: 'Appointment request created', data: newReq });
    } catch (error) {
        console.error('Error creating appointment request:', error);
        return res.status(500).json({ success: false, error: 'Failed to create appointment request' });
    }
});

app.put('/api/patient/appointment-requests/:requestId/cancel', (req, res) => {
    const id = parseInt(req.params.requestId);
    const idx = appointmentRequests.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Appointment request not found' });
    appointmentRequests[idx].status = 'cancelled';
    return res.json({ success: true, message: 'Appointment request cancelled', data: appointmentRequests[idx] });
});

// -------------------- PATIENT-SPECIFIC ENDPOINTS --------------------

// Debug: test route to verify nested doctor objects are returned correctly
app.get('/api/debug/test-appointment', (req, res) => {
    return res.json({ success: true, data: [{ id: 999, doctor: { username: 'Dr. Test Doctor', name: 'Dr. Test Doctor', specialization: 'General Medicine', id: 999 } }] });
});


// GET patient appointments (convenience route expected by frontend)
app.get('/api/patient/appointments', (req, res) => {
    console.log('🔎 /api/patient/appointments requested, query:', req.query);
    const patientId = parseInt(req.query.patientId) || parseInt(req.query.patient_id) || null;
    // Helper: enrich appointment objects with a nested `doctor` object expected by frontend
    const enrichWithDoctor = (list) => {
        return list.map(a => {
            const doctorId = a.doctorId || a.doctor_id;
            const user = users.find(u => u.id === doctorId) || {};
            const doctorObj = a.doctor || {
                username: user.username || user.name || a.doctorName || a.doctor_name || 'Unknown Doctor',
                name: user.name || a.doctorName || a.doctor_name || 'Unknown Doctor',
                specialization: user.specialization || a.doctorSpecialization || a.specialization || 'General Medicine',
                id: doctorId || null
            };

            return { ...a, doctor: doctorObj };
        });
    };

    if (!patientId) {
        const enriched = enrichWithDoctor(appointments);
        console.log('🔧 Enriched appointments sample (no patientId):', enriched.length ? enriched[0].doctor : '(none)');
        return res.json({ success: true, data: enriched, count: enriched.length });
    }

    const patientAppointments = appointments.filter(a => a.patientId === patientId || a.patient_id === patientId);
    const enriched = enrichWithDoctor(patientAppointments);
    console.log('🔧 Enriched appointments sample (patientId):', enriched.length ? enriched[0].doctor : '(none)');
    res.json({ success: true, data: enriched, count: enriched.length });
});

// GET patient prescriptions
app.get('/api/patient/prescriptions', (req, res) => {
    console.log('🔎 /api/patient/prescriptions requested, query:', req.query);
    const patientId = parseInt(req.query.patientId) || parseInt(req.query.patient_id) || null;
    if (!patientId) return res.json({ success: true, data: prescriptions, count: prescriptions.length });
    const list = prescriptions.filter(p => p.patientId === patientId);
    res.json({ success: true, data: list, count: list.length });
});

// GET patient lab results
app.get('/api/patient/lab-results', (req, res) => {
    console.log('🔎 /api/patient/lab-results requested, query:', req.query);
    const patientId = parseInt(req.query.patientId) || parseInt(req.query.patient_id) || null;
    if (!patientId) return res.json({ success: true, data: labResults, count: labResults.length });
    const list = labResults.filter(lr => lr.patientId === patientId);
    res.json({ success: true, data: list, count: list.length });
});

// GET patient billing history
app.get('/api/patient/billing', (req, res) => {
    console.log('🔎 /api/patient/billing requested, query:', req.query);
    const patientId = parseInt(req.query.patientId) || parseInt(req.query.patient_id) || null;
    if (!patientId) return res.json({ success: true, data: billings, count: billings.length });
    const list = billings.filter(b => b.patientId === patientId);
    res.json({ success: true, data: list, count: list.length });
});

// GET patient medical records
app.get('/api/patient/medical-records', async (req, res) => {
    console.log('🔎 /api/patient/medical-records requested, query:', req.query);
    const patientId = parseInt(req.query.patientId) || parseInt(req.query.patient_id) || null;

    // Try to use DB-backed MedicalNote model when available
    try {
        const MedicalNoteModel = require('./models/medicalNote');
        if (patientId) {
            const notes = await MedicalNoteModel.findAll({
                where: { patientId },
                order: [['createdAt', 'DESC']]
            });
            const mapped = notes.map(n => ({
                id: n.id,
                patientId: n.patientId,
                doctorId: n.doctorId,
                noteType: n.noteType || 'note',
                content: n.content || n.note || '',
                diagnosis: n.diagnosis || null,
                treatmentPlan: n.treatmentPlan || null,
                followUpDate: n.followUpDate || n.follow_up_date || null,
                createdAt: n.createdAt
            }));
            return res.json({ success: true, data: mapped, count: mapped.length });
        } else {
            // If no patient specified, return recent notes (limit 50)
            const notes = await MedicalNoteModel.findAll({ order: [['createdAt', 'DESC']], limit: 50 });
            const mapped = notes.map(n => ({
                id: n.id,
                patientId: n.patientId,
                doctorId: n.doctorId,
                noteType: n.noteType || 'note',
                content: n.content || n.note || '',
                diagnosis: n.diagnosis || null,
                treatmentPlan: n.treatmentPlan || null,
                followUpDate: n.followUpDate || n.follow_up_date || null,
                createdAt: n.createdAt
            }));
            return res.json({ success: true, data: mapped, count: mapped.length });
        }
    } catch (dbErr) {
        console.warn('DB medical notes unavailable, falling back to in-memory store:', dbErr.message);
        // Fallback to in-memory array - enrich with doctor info from users array
        if (!patientId) {
            const enrichedAll = medicalRecords.map(m => {
                const doc = users.find(u => u.id === m.doctorId) || null;
                return {
                    ...m,
                    doctor: doc ? { id: doc.id, name: doc.name || `${doc.first_name || ''} ${doc.last_name || ''}`.trim(), username: doc.username || doc.email } : { id: m.doctorId || null, name: 'Dr. Unknown' }
                };
            });
            return res.json({ success: true, data: enrichedAll, count: enrichedAll.length });
        }
        const list = medicalRecords.filter(m => m.patientId === patientId);
        const enriched = list.map(m => {
            const doc = users.find(u => u.id === m.doctorId) || null;
            return {
                ...m,
                doctor: doc ? { id: doc.id, name: doc.name || `${doc.first_name || ''} ${doc.last_name || ''}`.trim(), username: doc.username || doc.email } : { id: m.doctorId || null, name: 'Dr. Unknown' }
            };
        });
        return res.json({ success: true, data: enriched, count: enriched.length });
    }
});

// PUT update patient profile
app.put('/api/patient/profile', (req, res) => {
    console.log('✏️ /api/patient/profile update requested');
    try {
        // Try to extract user id from Authorization header (Bearer token)
        let userId = null;
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && typeof authHeader === 'string') {
            const parts = authHeader.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                try {
                    const decoded = jwt.verify(parts[1], process.env.JWT_SECRET || 'dev-secret-key');
                    userId = decoded.userId;
                } catch (err) {
                    console.warn('⚠️ Invalid JWT provided for profile update:', err.message);
                }
            }
        }

        const body = req.body || {};

        // If no userId from token, attempt to find by email in body
        if (!userId && body.email) {
            const found = users.find(u => u.email === body.email);
            if (found) userId = found.id;
        }

        // Fallback to first patient user if still not found
        if (!userId) {
            const fallback = users.find(u => u.role === 'patient');
            userId = fallback ? fallback.id : (users[0] && users[0].id) || 1;
        }

        // Update user in users array
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const updatable = ['name', 'email', 'phone', 'first_name', 'last_name'];
        updatable.forEach(field => {
            if (typeof body[field] !== 'undefined') {
                users[userIndex][field] = body[field];
            }
        });

        // Also update patients array entry if present
        const patientIndex = patients.findIndex(p => p.id === userId || p.id === users[userIndex].id);
        if (patientIndex !== -1) {
            const patientUpdatable = ['name', 'phone', 'address', 'dateOfBirth', 'emergencyContact', 'emergencyPhone', 'bloodType', 'allergies', 'medicalHistory'];
            patientUpdatable.forEach(field => {
                if (typeof body[field] !== 'undefined') {
                    // map camelCase to snake-like fields as stored in mock
                    patients[patientIndex][field] = body[field];
                }
            });
        }

        // Prepare user response without password
        const { password, ...userWithoutPassword } = users[userIndex];

        console.log('✅ Patient profile updated for userId:', userId);
        return res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error('❌ Error updating patient profile:', error);
        return res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
});

// -------------------- DEBUG / DEV HELPERS (local only) --------------------
// WARNING: These endpoints are for local development and testing only.
// They should NOT be present in production.

// Reset the first user to a known admin account (useful when in-memory user was modified)
app.post('/api/debug/reset-admin', async (req, res) => {
    try {
        const desiredEmail = req.body?.email || 'feredeworkineh4@gmail.com';
        const desiredPassword = req.body?.password || 'Test@1234';

        // Ensure users array has at least one entry
        if (!users || users.length === 0) {
            users = [];
        }

        const hashed = await bcrypt.hash(desiredPassword, 10);

        // If user with desired email exists, update password; else replace first user
        let userIndex = users.findIndex(u => u.email === desiredEmail);
        if (userIndex === -1) {
            // Replace or create first user entry
            const newUser = {
                id: 1,
                email: desiredEmail,
                password: hashed,
                name: 'Admin User',
                role: 'admin',
                clinicId: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
                lastLogin: null
            };
            if (users.length === 0) users.push(newUser);
            else users[0] = newUser;
            userIndex = 0;
        } else {
            users[userIndex].password = hashed;
            users[userIndex].role = users[userIndex].role || 'admin';
            users[userIndex].name = users[userIndex].name || 'Admin User';
        }

        console.log('🔧 Debug: admin reset to', users[userIndex].email);
        return res.json({ success: true, message: 'Admin reset', email: users[userIndex].email, password: desiredPassword });
    } catch (err) {
        console.error('❌ Failed to reset admin:', err);
        return res.status(500).json({ success: false, error: 'Failed to reset admin' });
    }
});

// -------------------- LAB TECHNICIAN ENDPOINTS --------------------

// GET pending lab tests for technicians
app.get('/api/lab/pending-tests', (req, res) => {
    console.log('🔎 /api/lab/pending-tests requested, query:', req.query);
    const list = labRequests.filter(lr => !lr.status || lr.status === 'pending');
    // Enrich with patient/doctor/technician objects from in-memory stores to avoid frontend ambiguity
    const enriched = list.map(lr => {
        const patient = (typeof lr.patient === 'object' && lr.patient) || patients.find(p => p.id === lr.patientId) || (users.find(u => u.id === lr.patientId) ? users.find(u => u.id === lr.patientId) : null);
        const doctor = (typeof lr.doctor === 'object' && lr.doctor) || (lr.doctorId ? users.find(u => u.id === lr.doctorId) : null);
        const technician = (typeof lr.technician === 'object' && lr.technician) || (lr.technicianId ? users.find(u => u.id === lr.technicianId) : null);
        return {
            ...lr,
            patient: patient ? { id: patient.id, username: patient.username || patient.name || (patient.email && patient.email.split('@')[0]), name: patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() } : null,
            doctor: doctor ? { id: doctor.id, username: doctor.username || doctor.name || (doctor.email && doctor.email.split('@')[0]), name: doctor.name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() } : null,
            technician: technician ? { id: technician.id, username: technician.username || technician.name || (technician.email && technician.email.split('@')[0]), name: technician.name || `${technician.first_name || ''} ${technician.last_name || ''}`.trim() } : null
        };
    });
    return res.json({ success: true, data: enriched, count: enriched.length });
});

// GET in-progress tests (assigned to a technician)
app.get('/api/lab/in-progress-tests', (req, res) => {
    console.log('🔎 /api/lab/in-progress-tests requested, query:', req.query);
    const list = labRequests.filter(lr => lr.status === 'in_progress' || lr.status === 'processing');
    const enriched = list.map(lr => {
        const patient = (typeof lr.patient === 'object' && lr.patient) || patients.find(p => p.id === lr.patientId) || (users.find(u => u.id === lr.patientId) ? users.find(u => u.id === lr.patientId) : null);
        const doctor = (typeof lr.doctor === 'object' && lr.doctor) || (lr.doctorId ? users.find(u => u.id === lr.doctorId) : null);
        const technician = (typeof lr.technician === 'object' && lr.technician) || (lr.technicianId ? users.find(u => u.id === lr.technicianId) : null);
        return {
            ...lr,
            patient: patient ? { id: patient.id, username: patient.username || patient.name || (patient.email && patient.email.split('@')[0]), name: patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() } : null,
            doctor: doctor ? { id: doctor.id, username: doctor.username || doctor.name || (doctor.email && doctor.email.split('@')[0]), name: doctor.name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() } : null,
            technician: technician ? { id: technician.id, username: technician.username || technician.name || (technician.email && technician.email.split('@')[0]), name: technician.name || `${technician.first_name || ''} ${technician.last_name || ''}`.trim() } : null
        };
    });
    return res.json({ success: true, data: enriched, count: enriched.length });
});

// GET completed tests (from labResults)
app.get('/api/lab/completed-tests', (req, res) => {
    console.log('🔎 /api/lab/completed-tests requested, query:', req.query);
    try {
        const enriched = labResults.map(r => {
            const patient = (typeof r.patient === 'object' && r.patient) || patients.find(p => p.id === r.patientId) || users.find(u => u.id === r.patientId) || null;
            const technician = (typeof r.technician === 'object' && r.technician) || (r.technicianId ? users.find(u => u.id === r.technicianId) : null);

            // Attach the originating lab request, enriched with patient/doctor/technician as in other endpoints
            const reqItem = labRequests.find(lr => lr.id === r.labRequestId) || null;
            const reqPatient = reqItem ? ((typeof reqItem.patient === 'object' && reqItem.patient) || patients.find(p => p.id === reqItem.patientId) || users.find(u => u.id === reqItem.patientId) || null) : null;
            const reqDoctor = reqItem ? ((typeof reqItem.doctor === 'object' && reqItem.doctor) || (reqItem.doctorId ? users.find(u => u.id === reqItem.doctorId) : null)) : null;
            const reqTechnician = reqItem ? ((typeof reqItem.technician === 'object' && reqItem.technician) || (reqItem.technicianId ? users.find(u => u.id === reqItem.technicianId) : null)) : null;
            const enrichedReq = reqItem ? {
                ...reqItem,
                patient: reqPatient ? { id: reqPatient.id, username: reqPatient.username || reqPatient.name || (reqPatient.email && reqPatient.email.split('@')?.[0]), name: reqPatient.name || `${reqPatient.first_name || ''} ${reqPatient.last_name || ''}`.trim() } : null,
                doctor: reqDoctor ? { id: reqDoctor.id, username: reqDoctor.username || reqDoctor.name || (reqDoctor.email && reqDoctor.email.split('@')?.[0]), name: reqDoctor.name || `${reqDoctor.first_name || ''} ${reqDoctor.last_name || ''}`.trim() } : null,
                technician: reqTechnician ? { id: reqTechnician.id, username: reqTechnician.username || reqTechnician.name || (reqTechnician.email && reqTechnician.email.split('@')?.[0]), name: reqTechnician.name || `${reqTechnician.first_name || ''} ${reqTechnician.last_name || ''}`.trim() } : null
            } : null;

            return {
                ...r,
                labRequest: enrichedReq,
                patient: patient ? { id: patient.id, username: patient.username || patient.name || (patient.email && patient.email.split('@')?.[0]), name: patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() } : null,
                technician: technician ? { id: technician.id, username: technician.username || technician.name || (technician.email && technician.email.split('@')?.[0]), name: technician.name || `${technician.first_name || ''} ${technician.last_name || ''}`.trim() } : null
            };
        });
        return res.json({ success: true, data: enriched, count: enriched.length });
    } catch (err) {
        console.error('Error enriching completed-tests:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch completed tests' });
    }
});

// Additional endpoints expected by doctorService: return same enriched results under /lab-results and /doctor/lab-results
app.get('/api/lab-results', (req, res) => {
    console.log('🔎 /api/lab-results requested');
    try {
        const enriched = labResults.map(r => {
            const patient = (typeof r.patient === 'object' && r.patient) || patients.find(p => p.id === r.patientId) || users.find(u => u.id === r.patientId) || null;
            const technician = (typeof r.technician === 'object' && r.technician) || (r.technicianId ? users.find(u => u.id === r.technicianId) : null);
            const reqItem = labRequests.find(lr => lr.id === r.labRequestId) || null;
            const reqPatient = reqItem ? ((typeof reqItem.patient === 'object' && reqItem.patient) || patients.find(p => p.id === reqItem.patientId) || users.find(u => u.id === reqItem.patientId) || null) : null;
            const reqDoctor = reqItem ? ((typeof reqItem.doctor === 'object' && reqItem.doctor) || (reqItem.doctorId ? users.find(u => u.id === reqItem.doctorId) : null)) : null;
            const reqTechnician = reqItem ? ((typeof reqItem.technician === 'object' && reqItem.technician) || (reqItem.technicianId ? users.find(u => u.id === reqItem.technicianId) : null)) : null;
            const enrichedReq = reqItem ? {
                ...reqItem,
                patient: reqPatient ? { id: reqPatient.id, username: reqPatient.username || reqPatient.name || (reqPatient.email && reqPatient.email.split('@')?.[0]), name: reqPatient.name || `${reqPatient.first_name || ''} ${reqPatient.last_name || ''}`.trim() } : null,
                doctor: reqDoctor ? { id: reqDoctor.id, username: reqDoctor.username || reqDoctor.name || (reqDoctor.email && reqDoctor.email.split('@')?.[0]), name: reqDoctor.name || `${reqDoctor.first_name || ''} ${reqDoctor.last_name || ''}`.trim() } : null,
                technician: reqTechnician ? { id: reqTechnician.id, username: reqTechnician.username || reqTechnician.name || (reqTechnician.email && reqTechnician.email.split('@')?.[0]), name: reqTechnician.name || `${reqTechnician.first_name || ''} ${reqTechnician.last_name || ''}`.trim() } : null
            } : null;

            return {
                ...r,
                labRequest: enrichedReq,
                patient: patient ? { id: patient.id, username: patient.username || patient.name || (patient.email && patient.email.split('@')?.[0]), name: patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() } : null,
                technician: technician ? { id: technician.id, username: technician.username || technician.name || (technician.email && technician.email.split('@')?.[0]), name: technician.name || `${technician.first_name || ''} ${technician.last_name || ''}`.trim() } : null
            };
        });
        return res.json({ success: true, labResults: enriched, count: enriched.length });
    } catch (err) {
        console.error('Error in /api/lab-results:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch lab results' });
    }
});

app.get('/api/doctor/lab-results', (req, res) => {
    console.log('🔎 /api/doctor/lab-results requested');
    // Reuse the same logic
    try {
        const enriched = labResults.map(r => {
            const patient = (typeof r.patient === 'object' && r.patient) || patients.find(p => p.id === r.patientId) || users.find(u => u.id === r.patientId) || null;
            const technician = (typeof r.technician === 'object' && r.technician) || (r.technicianId ? users.find(u => u.id === r.technicianId) : null);
            const reqItem = labRequests.find(lr => lr.id === r.labRequestId) || null;
            const reqPatient = reqItem ? ((typeof reqItem.patient === 'object' && reqItem.patient) || patients.find(p => p.id === reqItem.patientId) || users.find(u => u.id === reqItem.patientId) || null) : null;
            const reqDoctor = reqItem ? ((typeof reqItem.doctor === 'object' && reqItem.doctor) || (reqItem.doctorId ? users.find(u => u.id === reqItem.doctorId) : null)) : null;
            const reqTechnician = reqItem ? ((typeof reqItem.technician === 'object' && reqItem.technician) || (reqItem.technicianId ? users.find(u => u.id === reqItem.technicianId) : null)) : null;
            const enrichedReq = reqItem ? {
                ...reqItem,
                patient: reqPatient ? { id: reqPatient.id, username: reqPatient.username || reqPatient.name || (reqPatient.email && reqPatient.email.split('@')?.[0]), name: reqPatient.name || `${reqPatient.first_name || ''} ${reqPatient.last_name || ''}`.trim() } : null,
                doctor: reqDoctor ? { id: reqDoctor.id, username: reqDoctor.username || reqDoctor.name || (reqDoctor.email && reqDoctor.email.split('@')?.[0]), name: reqDoctor.name || `${reqDoctor.first_name || ''} ${reqDoctor.last_name || ''}`.trim() } : null,
                technician: reqTechnician ? { id: reqTechnician.id, username: reqTechnician.username || reqTechnician.name || (reqTechnician.email && reqTechnician.email.split('@')?.[0]), name: reqTechnician.name || `${reqTechnician.first_name || ''} ${reqTechnician.last_name || ''}`.trim() } : null
            } : null;

            return {
                ...r,
                labRequest: enrichedReq,
                patient: patient ? { id: patient.id, username: patient.username || patient.name || (patient.email && patient.email.split('@')?.[0]), name: patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() } : null,
                technician: technician ? { id: technician.id, username: technician.username || technician.name || (technician.email && technician.email.split('@')?.[0]), name: technician.name || `${technician.first_name || ''} ${technician.last_name || ''}`.trim() } : null
            };
        });
        return res.json({ success: true, labResults: enriched, count: enriched.length });
    } catch (err) {
        console.error('Error in /api/doctor/lab-results:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch lab results' });
    }
});

// ADMIN DEBUG: Patch in-memory lab requests that are missing doctorId (dev convenience)
app.post('/api/admin/patch-missing-doctors', (req, res) => {
    try {
        let patched = 0;
        labRequests = labRequests.map(lr => {
            if (!lr.doctorId) {
                const defaultDoc = users.find(u => u.role === 'doctor') || users[0] || null;
                if (defaultDoc) {
                    lr.doctorId = defaultDoc.id;
                    lr.doctor = { id: defaultDoc.id, username: defaultDoc.username || defaultDoc.email?.split('@')?.[0], name: defaultDoc.name || `${defaultDoc.first_name || ''} ${defaultDoc.last_name || ''}`.trim() };
                    patched++;
                }
            }
            return lr;
        });
        console.log(`Patched ${patched} lab requests to include default doctor`);
        res.json({ success: true, patched, data: labRequests });
    } catch (err) {
        console.error('Failed to patch lab requests:', err);
        res.status(500).json({ success: false, error: 'Failed to patch lab requests' });
    }
});

// GET a single test details (lab request + optional result)
app.get('/api/lab/test/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const reqItem = labRequests.find(lr => lr.id === id);
    const result = labResults.find(r => r.labRequestId === id);
    if (!reqItem) return res.status(404).json({ success: false, error: 'Lab request not found' });

    // enrich request with patient/doctor/technician objects
    const patient = (typeof reqItem.patient === 'object' && reqItem.patient) || patients.find(p => p.id === reqItem.patientId) || users.find(u => u.id === reqItem.patientId) || null;
    const doctor = (typeof reqItem.doctor === 'object' && reqItem.doctor) || (reqItem.doctorId ? users.find(u => u.id === reqItem.doctorId) : null);
    const technician = (typeof reqItem.technician === 'object' && reqItem.technician) || (reqItem.technicianId ? users.find(u => u.id === reqItem.technicianId) : null);

    const enriched = {
        ...reqItem,
        patient: patient ? { id: patient.id, username: patient.username || patient.name || (patient.email && patient.email.split('@')[0]), name: patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() } : null,
        doctor: doctor ? { id: doctor.id, username: doctor.username || doctor.name || (doctor.email && doctor.email.split('@')[0]), name: doctor.name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() } : null,
        technician: technician ? { id: technician.id, username: technician.username || technician.name || (technician.email && technician.email.split('@')[0]), name: technician.name || `${technician.first_name || ''} ${technician.last_name || ''}`.trim() } : null
    };

    // Enrich the associated result (if any) with patient and technician objects as well
    const enrichedResult = result ? {
        ...result,
        labRequest: enriched, // attach the enriched lab request so frontend can rely on result.labRequest.patient
        patient: patient ? { id: patient.id, username: patient.username || patient.name || (patient.email && patient.email.split('@')?.[0]), name: patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() } : null,
        technician: (typeof result.technician === 'object' && result.technician) || (result.technicianId ? (users.find(u => u.id === result.technicianId) ? { id: result.technicianId, username: (users.find(u => u.id === result.technicianId).username || users.find(u => u.id === result.technicianId).name), name: (users.find(u => u.id === result.technicianId).name) } : null) : null)
    } : null;

    return res.json({ success: true, data: { request: enriched, result: enrichedResult } });
});

// Technician accepts a test request (assigns to technician and marks in-progress)
app.post('/api/lab/accept-test-request', (req, res) => {
    const { labRequestId, testId, technicianId } = req.body || {};
    const id = parseInt(labRequestId || testId);
    const idx = labRequests.findIndex(lr => lr.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Lab request not found' });
    labRequests[idx].status = 'in_progress';
    if (technicianId) labRequests[idx].technicianId = technicianId;
    labRequests[idx].acceptedAt = new Date().toISOString();
    console.log('🧪 Lab request accepted:', labRequests[idx]);
    return res.json({ success: true, data: labRequests[idx] });
});

// Technician posts test result
app.post('/api/lab/enter-test-result', (req, res) => {
    const body = req.body || {};
    const id = parseInt(body.labRequestId || body.testId || body.id);
    if (!id) return res.status(400).json({ success: false, error: 'Missing labRequestId' });
    const reqIdx = labRequests.findIndex(lr => lr.id === id);
    if (reqIdx === -1) return res.status(404).json({ success: false, error: 'Lab request not found' });

    const newResult = {
        id: (labResults.length ? Math.max(...labResults.map(r => r.id)) : 0) + 1,
        labRequestId: id,
        patientId: labRequests[reqIdx].patientId,
        technicianId: body.technicianId || labRequests[reqIdx].technicianId || null,
        resultDetails: body.resultDetails || body.results || body.resultsText || '',
        findings: body.findings || '',
        notes: body.notes || '',
        date: new Date().toISOString()
    };

    labResults.push(newResult);
    labRequests[reqIdx].status = 'completed';
    labRequests[reqIdx].completedAt = new Date().toISOString();

    console.log('✅ Test result recorded:', newResult);
    return res.json({ success: true, data: newResult });
});

// GET lab stats
app.get('/api/lab/stats', (req, res) => {
    const pending = labRequests.filter(r => !r.status || r.status === 'pending').length;
    const inProgress = labRequests.filter(r => r.status === 'in_progress' || r.status === 'processing').length;
    const completed = labResults.length;
    return res.json({ success: true, data: { pending, inProgress, completed } });
});

// ==================== 404 HANDLER (catch-all) ====================
app.use((req, res) => {
    console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.originalUrl} not found`
    });
});