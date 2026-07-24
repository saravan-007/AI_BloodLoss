const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  identifier: { type: String, required: true }, // email or mobile
  otp:        { type: String, required: true },
  role:       { type: String, enum: ['doctor', 'nurse'], required: true },
  purpose:    { type: String, enum: ['register', 'reset'], default: 'register' },
  createdAt:  { type: Date, default: Date.now, expires: 600 }, // auto-delete after 10 min
});

module.exports = mongoose.model('OTP', otpSchema);
