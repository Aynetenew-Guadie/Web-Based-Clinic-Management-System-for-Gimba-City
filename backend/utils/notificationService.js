const { sendEmail } = require('./emailService');
const { sendSMS } = require('./smsService');

class NotificationService {

  static async notifyLabTestCompleted(doctorEmail, patientName, testType, urgency) {
    try {
      await sendEmail({
        to: doctorEmail,
        subject: 'Lab Test Results Ready',
        text: `Lab test results for patient ${patientName} are now available. Please review and create prescription if needed.`,
        html: `
          <h3>Lab Test Results Ready</h3>
          <p>Lab test results for patient <strong>${patientName}</strong> are now available.</p>
          <p><strong>Test Type:</strong> ${testType}</p>
          <p><strong>Urgency:</strong> ${urgency}</p>
          <p>Please review the results and create prescription if needed.</p>
        `
      });
      return true;
    } catch (error) {
      console.error('Failed to send lab test completion notification:', error);
      return false;
    }
  }

  static async notifyNewAppointmentRequest(receptionistEmails, patientName, preferredDate, timeSlot, visitType, urgency) {
    const notifications = [];
    
    for (const email of receptionistEmails) {
      try {
        await sendEmail({
          to: email,
          subject: 'New Appointment Request',
          text: `A new appointment request has been submitted by patient ${patientName}. Please review and schedule accordingly.`,
          html: `
            <h3>New Appointment Request</h3>
            <p>A new appointment request has been submitted.</p>
            <p><strong>Patient:</strong> ${patientName}</p>
            <p><strong>Preferred Date:</strong> ${preferredDate}</p>
            <p><strong>Time Slot:</strong> ${timeSlot}</p>
            <p><strong>Visit Type:</strong> ${visitType}</p>
            <p><strong>Urgency:</strong> ${urgency}</p>
            <p>Please review and schedule accordingly.</p>
          `
        });
        notifications.push({ email, success: true });
      } catch (error) {
        console.error(`Failed to send notification to ${email}:`, error);
        notifications.push({ email, success: false, error: error.message });
      }
    }
    
    return notifications;
  }

  static async notifyAppointmentApproved(patientEmail, appointmentDate, startTime, endTime, doctorName, roomNumber) {
    try {
      await sendEmail({
        to: patientEmail,
        subject: 'Appointment Request Approved',
        text: `Your appointment request for ${appointmentDate} has been approved and scheduled.`,
        html: `
          <h3>Appointment Request Approved</h3>
          <p>Your appointment request has been approved and scheduled.</p>
          <p><strong>Date:</strong> ${appointmentDate}</p>
          <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
          <p><strong>Doctor:</strong> ${doctorName || 'To be assigned'}</p>
          <p><strong>Room:</strong> ${roomNumber || 'To be assigned'}</p>
          <p>Please arrive 15 minutes before your scheduled time.</p>
        `
      });
      return true;
    } catch (error) {
      console.error('Failed to send appointment approval notification:', error);
      return false;
    }
  }

  static async notifyAppointmentRejected(patientEmail, preferredDate, reason) {
    try {
      await sendEmail({
        to: patientEmail,
        subject: 'Appointment Request Update',
        text: `Your appointment request for ${preferredDate} could not be scheduled. Please contact the clinic for alternatives.`,
        html: `
          <h3>Appointment Request Update</h3>
          <p>Your appointment request for ${preferredDate} could not be scheduled.</p>
          <p><strong>Reason:</strong> ${reason || 'Schedule conflict'}</p>
          <p>Please contact the clinic for alternative scheduling options.</p>
        `
      });
      return true;
    } catch (error) {
      console.error('Failed to send appointment rejection notification:', error);
      return false;
    }
  }

  static async notifyNewPrescription(patientEmail, medication, dosage, instructions) {
    try {
      await sendEmail({
        to: patientEmail,
        subject: 'New Prescription Available',
        text: `A new prescription for ${medication} has been prescribed by your doctor. Please check your patient portal for details.`,
        html: `
          <h3>New Prescription Available</h3>
          <p>A new prescription has been prescribed by your doctor.</p>
          <p><strong>Medication:</strong> ${medication}</p>
          <p><strong>Dosage:</strong> ${dosage}</p>
          <p><strong>Instructions:</strong> ${instructions}</p>
          <p>Please check your patient portal for complete details.</p>
        `
      });
      return true;
    } catch (error) {
      console.error('Failed to send prescription notification:', error);
      return false;
    }
  }

  static async notifyAppointmentScheduled(patientEmail, appointmentDate, time, visitType) {
    try {
      await sendEmail({
        to: patientEmail,
        subject: 'New Appointment Scheduled',
        text: `A new appointment has been scheduled for you on ${appointmentDate} at ${time}.`,
        html: `
          <h3>New Appointment Scheduled</h3>
          <p>A new appointment has been scheduled for you.</p>
          <p><strong>Date:</strong> ${appointmentDate}</p>
          <p><strong>Time:</strong> ${time}</p>
          <p><strong>Visit Type:</strong> ${visitType}</p>
          <p>Please arrive 15 minutes before your scheduled time.</p>
        `
      });
      return true;
    } catch (error) {
      console.error('Failed to send appointment notification:', error);
      return false;
    }
  }


  static async sendSMSNotification(phoneNumber, message) {
    try {
      await sendSMS(phoneNumber, message);
      return true;
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      return false;
    }
  }
}

module.exports = NotificationService;
