const LabRequest = require('../models/labRequest');
const LabResult = require('../models/labResult');
const Billing = require('../models/billing');
const User = require('../models/user');
const { sendEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');

const getLabTestPrice = (testType) => {
  const prices = {
    'Blood Test': 50.00,
    'Urine Test': 30.00,
    'X-Ray': 100.00,
    'MRI': 500.00,
    'CT Scan': 300.00,
    'Ultrasound': 150.00,
    'ECG': 75.00,
    'Biopsy': 200.00
  };
  return prices[testType] || 75.00; 
};

// Get pending tests
exports.getPendingTests = async (req, res) => {
  try {
    console.log('Fetching pending tests for lab technician:', req.user?.id);
    
    if (!req.user || (req.user.role !== 'lab_technician' && req.user.role !== 'lab_tech')) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied: Lab technician role required' 
      });
    }

    const pendingTests = await LabRequest.findAll({
      where: { status: 'pending' },
      include: [
        { model: User, as: 'patient', attributes: ['id', 'username', 'email', 'name'] },
        { model: User, as: 'doctor', attributes: ['id', 'username', 'email', 'name'] }
      ],
      order: [['dateRequested', 'ASC']],
    });

    console.log(`Found ${pendingTests.length} pending tests`);

    res.json({
      success: true,
      tests: pendingTests,
      count: pendingTests.length,
      message: 'Pending tests retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching pending tests:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching pending tests',
      message: error.message 
    });
  }
};

// Get in-progress tests
exports.getInProgressTests = async (req, res) => {
  try {
    console.log('Fetching in-progress tests for lab technician:', req.user?.id);
    
    if (!req.user || (req.user.role !== 'lab_technician' && req.user.role !== 'lab_tech')) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied: Lab technician role required' 
      });
    }

    const inProgressTests = await LabRequest.findAll({
      where: { 
        status: 'in_progress',
        technicianId: req.user.id 
      },
      include: [
        { model: User, as: 'patient', attributes: ['id', 'username', 'email', 'name'] },
        { model: User, as: 'doctor', attributes: ['id', 'username', 'email', 'name'] }
      ],
      order: [['acceptedAt', 'ASC']],
    });

    console.log(`Found ${inProgressTests.length} in-progress tests for technician ${req.user.id}`);

    res.json({
      success: true,
      tests: inProgressTests,
      count: inProgressTests.length,
      message: 'In-progress tests retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching in-progress tests:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching in-progress tests',
      message: error.message 
    });
  }
};

// Accept test request
exports.acceptTestRequest = async (req, res) => {
  try {
    const { labRequestId, testId } = req.body;
    
    // Support both labRequestId and testId for backward compatibility
    const requestId = labRequestId || testId;
    
    if (!requestId) {
      return res.status(400).json({ 
        success: false,
        error: 'Lab request ID or test ID is required' 
      });
    }

    console.log(`Lab technician ${req.user.id} accepting test request:`, requestId);

    const labRequest = await LabRequest.findByPk(requestId, {
      include: [
        { model: User, as: 'patient', attributes: ['id', 'username', 'email', 'name'] },
        { model: User, as: 'doctor', attributes: ['id', 'username', 'email', 'name'] }
      ]
    });
    
    if (!labRequest) {
      return res.status(404).json({ 
        success: false,
        error: 'Lab request not found' 
      });
    }
    
    if (labRequest.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        error: `Test request is already ${labRequest.status}` 
      });
    }

    // Update the lab request
    await labRequest.update({ 
      status: 'in_progress',
      technicianId: req.user.id,
      acceptedAt: new Date()
    });

    // Reload the request to get updated data
    await labRequest.reload();

    console.log(`Test request ${requestId} accepted by technician ${req.user.id}`);
    
    // Send notification to doctor
    if (labRequest.doctor && labRequest.doctor.email) {
      try {
        await sendEmail({
          to: labRequest.doctor.email,
          subject: 'Lab Test Request Accepted',
          text: `Lab test request for patient ${labRequest.patient.username || labRequest.patient.name} has been accepted and is being processed.`,
          html: `<p>Lab test request for patient <strong>${labRequest.patient.username || labRequest.patient.name}</strong> has been accepted and is being processed.</p>`
        });
        console.log('Email notification sent to doctor');
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }
    }
    
    res.json({ 
      success: true,
      message: 'Test request accepted successfully',
      labRequest: labRequest
    });
  } catch (error) {
    console.error('Error accepting test request:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error accepting test request',
      message: error.message 
    });
  }
};

// Enter test result
exports.enterTestResult = async (req, res) => {
  try {
    const { labRequestId, testId, resultDetails, results, findings, reportUrl, notes } = req.body;

    // Support both labRequestId and testId for backward compatibility
    const requestId = labRequestId || testId;

    if (!requestId) {
      return res.status(400).json({ 
        success: false,
        error: 'Lab request ID or test ID is required' 
      });
    }

    if (!resultDetails && !results) {
      return res.status(400).json({ 
        success: false,
        error: 'Test results are required' 
      });
    }

    console.log(`Lab technician ${req.user.id} entering results for test:`, requestId);

    const labRequest = await LabRequest.findByPk(requestId, {
      include: [
        { model: User, as: 'patient', attributes: ['id', 'username', 'email', 'name'] },
        { model: User, as: 'doctor', attributes: ['id', 'username', 'email', 'name'] }
      ]
    });
    
    if (!labRequest) {
      return res.status(404).json({ 
        success: false,
        error: 'Lab request not found' 
      });
    }
    
    if (labRequest.status !== 'in_progress') {
      return res.status(400).json({ 
        success: false,
        error: `Test is not in progress (current status: ${labRequest.status})` 
      });
    }

    // Check if technician is assigned to this test
    if (labRequest.technicianId !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        error: 'You are not assigned to this test' 
      });
    }

    // Use results if provided, otherwise use resultDetails for backward compatibility
    const finalResults = results || resultDetails;

    // Create lab result
    const labResult = await LabResult.create({
      labRequestId: requestId,
      patientId: labRequest.patientId,
      technicianId: req.user.id,
      resultDetails: finalResults,
      results: finalResults, // Add both fields for compatibility
      findings: findings || '',
      reportUrl: reportUrl || '',
      notes: notes || '',
      date: new Date(),
    });

    // Update lab request status
    await labRequest.update({ 
      status: 'completed',
      completedAt: new Date()
    });

    // Create billing record
    const billing = await Billing.create({
      patientId: labRequest.patientId,
      serviceType: `lab_test_${labRequest.testType?.toLowerCase().replace(/\s+/g, '_') || 'lab_test'}`,
      amount: getLabTestPrice(labRequest.testType),
      date: new Date(),
      paid: false,
      description: `Lab Test: ${labRequest.testType}`
    });

    console.log(`Test results entered for request ${requestId}`);

    // Send notification to doctor
    if (labRequest.doctor && labRequest.doctor.email) {
      try {
        await sendEmail({
          to: labRequest.doctor.email,
          subject: 'Lab Test Results Ready',
          text: `Lab test results for patient ${labRequest.patient.username || labRequest.patient.name} are now available. Please review and create prescription if needed.`,
          html: `
            <h3>Lab Test Results Ready</h3>
            <p>Lab test results for patient <strong>${labRequest.patient.username || labRequest.patient.name}</strong> are now available.</p>
            <p><strong>Test Type:</strong> ${labRequest.testType}</p>
            <p><strong>Urgency:</strong> ${labRequest.urgency}</p>
            <p>Please review the results and create prescription if needed.</p>
          `
        });
        console.log('Results notification email sent to doctor');
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Test result entered successfully',
      labResult: labResult,
      labRequest: labRequest,
      billing: billing
    });
  } catch (error) {
    console.error('Error entering test result:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error entering test result',
      message: error.message 
    });
  }
};

// Get completed tests
exports.getCompletedTests = async (req, res) => {
  try {
    console.log('Fetching completed tests for lab technician:', req.user?.id);

    const completedTests = await LabResult.findAll({
      where: {
        technicianId: req.user.id // Filter by current technician
      },
      include: [
        { 
          model: LabRequest, 
          as: 'labRequest', 
          include: [
            { model: User, as: 'patient', attributes: ['id', 'username', 'name'] },
            { model: User, as: 'doctor', attributes: ['id', 'username', 'name'] }
          ]
        },
        { model: User, as: 'technician', attributes: ['id', 'username', 'name'] }
      ],
      order: [['date', 'DESC']],
    });

    console.log(`Found ${completedTests.length} completed tests for technician ${req.user.id}`);

    res.json({
      success: true,
      tests: completedTests,
      count: completedTests.length,
      message: 'Completed tests retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching completed tests:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching completed tests',
      message: error.message 
    });
  }
};

// Get test by ID
exports.getTestById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Fetching test by ID:', id);

    const labRequest = await LabRequest.findByPk(id, {
      include: [
        { model: User, as: 'patient', attributes: ['id', 'username', 'email', 'name'] },
        { model: User, as: 'doctor', attributes: ['id', 'username', 'email', 'name'] },
        { model: LabResult, as: 'labResult' }
      ]
    });
    
    if (!labRequest) {
      return res.status(404).json({ 
        success: false,
        error: 'Lab request not found' 
      });
    }
    
    res.json({
      success: true,
      test: labRequest,
      message: 'Test details retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching test details',
      message: error.message 
    });
  }
};

// Get lab statistics
exports.getLabStats = async (req, res) => {
  try {
    console.log('Fetching lab statistics for technician:', req.user?.id);

    if (!req.user || (req.user.role !== 'lab_technician' && req.user.role !== 'lab_tech')) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied: Lab technician role required' 
      });
    }

    // Get counts for different statuses
    const pendingCount = await LabRequest.count({
      where: { status: 'pending' }
    });

    const inProgressCount = await LabRequest.count({
      where: { 
        status: 'in_progress',
        technicianId: req.user.id 
      }
    });

    const completedCount = await LabResult.count({
      where: { technicianId: req.user.id }
    });

    // Get today's date for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCompleted = await LabResult.count({
      where: {
        technicianId: req.user.id,
        date: {
          [Op.between]: [today, tomorrow]
        }
      }
    });

    const totalAssigned = inProgressCount + completedCount;

    res.json({
      success: true,
      stats: {
        pendingTests: pendingCount,
        inProgressTests: inProgressCount,
        completedTests: completedCount,
        totalAssignedTests: totalAssigned,
        todayCompleted: todayCompleted
      },
      message: 'Lab statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching lab statistics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching lab statistics',
      message: error.message 
    });
  }
};

// Get all tests (for debugging and admin purposes)
exports.getAllTests = async (req, res) => {
  try {
    console.log('Fetching all lab tests');

    if (!req.user || (req.user.role !== 'lab_technician' && req.user.role !== 'lab_tech' && req.user.role !== 'admin')) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied' 
      });
    }

    const allTests = await LabRequest.findAll({
      include: [
        { model: User, as: 'patient', attributes: ['id', 'username', 'name'] },
        { model: User, as: 'doctor', attributes: ['id', 'username', 'name'] },
        { model: LabResult, as: 'labResult' }
      ],
      order: [['dateRequested', 'DESC']],
    });

    res.json({
      success: true,
      tests: allTests,
      count: allTests.length,
      message: 'All tests retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching all tests:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching all tests',
      message: error.message 
    });
  }
};