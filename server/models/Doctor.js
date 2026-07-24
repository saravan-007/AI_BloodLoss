const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const doctorSchema = new mongoose.Schema({
  fullName:       { type: String, required: true, trim: true },
  address:        { type: String, trim: true, default: '' },
  mobileNumber:   { type: String, trim: true, default: '' },
  email:          { type: String, trim: true, lowercase: true, default: '' },
  specialization: { type: String, trim: true, default: '' },
  department:     { type: String, trim: true, default: '' },
  qualification:  { type: String, trim: true, default: '' },
  registrationNumber: { type: String, trim: true, default: '' },
  hospitalName:   { type: String, trim: true, default: '' },
  profilePhoto:   { type: String, default: '' },
  password:       { type: String, default: '' },
  isVerified:     { type: Boolean, default: false },
}, { timestamps: true });

// Hash password before save
doctorSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

doctorSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('Doctor', doctorSchema);
