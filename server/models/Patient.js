const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  patientName: { type: String, required: true, trim: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  mobileNumber: { type: String, trim: true, default: '' },
  weight: { type: Number, required: true }, // in kg
  bloodGroup: { type: String, trim: true, default: '' }, // e.g. A+, B-, O+, AB+
  surgeryType: { type: String, required: true, trim: true },
  allergies: { type: String, trim: true, default: 'None' },
  medicalNotes: { type: String, trim: true, default: '' },
  surgeryDate: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'Discharged', 'Critical', 'Archived'], default: 'Active' },
  dischargedAt: { type: Date, default: null }, // Set when status changes to Discharged
  editLog: [
    {
      editedBy: { type: mongoose.Schema.Types.ObjectId },
      editedByName: { type: String },
      action: { type: String },
      timestamp: { type: Date, default: Date.now },
      changes: { type: String }
    }
  ],
  // Link to doctor or nurse who created
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdByRole: { type: String, enum: ['doctor', 'nurse'], required: true },
  // Link to appointed nurse
  appointedNurse: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' },
  // OT Room assignment
  otRoom: { type: String, trim: true, default: '' },
  dailyNotes: [
    {
      note: {
        type: String,
        required: true,
        trim: true
      },
      addedByName: { type: String, default: 'Doctor' },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor'
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      // Nurse replies to doctor notes
      replies: [
        {
          reply: { type: String, required: true, trim: true },
          repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' },
          repliedByName: { type: String, default: 'Nurse' },
          repliedAt: { type: Date, default: Date.now }
        }
      ]
    }
  ],
  aiReports: [
    {
      overallRiskLevel: { type: String },
      summary: { type: String },
      aiAnalysis: { type: String },
      aiRecommendations: [{ type: String }],
      aiPrecautions: [{ type: String }],
      aiRisks: [{ type: String }],
      aiSuggestedMedication: [{ type: String }],
      aiMonitoringAdvice: [{ type: String }],
      aiFollowUpSuggestions: [{ type: String }],
      createdAt: { type: Date, default: Date.now }
    }
  ],
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
