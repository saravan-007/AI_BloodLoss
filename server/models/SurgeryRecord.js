const mongoose = require('mongoose');

const surgeryRecordSchema = new mongoose.Schema({
  patientId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  surgeryDate:    { type: Date, default: Date.now },
  surgeryType:    { type: String, trim: true, default: '' },

  // Step 1 — Gauze
  smallGauzeCount: { type: Number, default: 0 },
  smallGauzeValue: { type: Number, default: 0 },
  largeGauzeCount: { type: Number, default: 0 },
  largeGauzeValue: { type: Number, default: 0 },
  smallGauzeBlood: { type: Number, default: 0 }, // small_count * small_val
  largeGauzeBlood: { type: Number, default: 0 }, // large_count * large_val
  totalGauzeBlood: { type: Number, default: 0 }, // small + large

  // Step 2 — Suction
  suctionBottleValue: { type: Number, default: 0 },
  salineUsed:         { type: Number, default: 0 },
  suctionBlood:       { type: Number, default: 0 }, // bottle - saline

  // Step 3 — Total Blood Loss
  totalBloodLoss: { type: Number, default: 0 }, // gauze + suction

  // Step 4 — Insensible Loss
  surgeryDuration: { type: Number, default: 0 }, // hours
  patientWeight:   { type: Number, default: 0 }, // kg
  insensibleLoss:  { type: Number, default: 0 }, // 2 * weight * duration

  // Step 5 — Urine
  urineCollected: { type: Number, default: 0 },

  // Step 6 — Total Fluid Loss
  totalFluidLoss: { type: Number, default: 0 }, // blood + urine + insensible

  // Meta
  createdBy:     { type: mongoose.Schema.Types.ObjectId, required: true },
  createdByRole: { type: String, enum: ['doctor', 'nurse'], required: true },

  // AI Analysis (stored after "Find Issue" is used)
  aiAnalysis: { type: String, default: '' }, // JSON string of AI chatbot analysis
}, { timestamps: true });

module.exports = mongoose.model('SurgeryRecord', surgeryRecordSchema);
