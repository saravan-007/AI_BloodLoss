const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, required: true }, // Doctor or Nurse ID
  recipientRole: { type: String, enum: ['doctor', 'nurse'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['appointment', 'report_share', 'alert'], default: 'appointment' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
