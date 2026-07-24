const SurgeryRecord = require('../models/SurgeryRecord');
const Patient = require('../models/Patient');

// GET all surgeries
exports.getSurgeries = async (req, res) => {
  try {
    const { date } = req.query;
    let query = {};

    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.surgeryDate = { $gte: start, $lt: end };
    }

    // Role-based visibility scoping
    let patientQuery = {};
    if (req.userRole === 'doctor') {
      patientQuery.createdBy = req.userId;
    } else if (req.userRole === 'nurse') {
      patientQuery.appointedNurse = req.userId;
    }
    const allowedPatients = await Patient.find(patientQuery);
    const allowedPatientIds = allowedPatients.map(p => p._id);
    query.patientId = { $in: allowedPatientIds };

    const surgeries = await SurgeryRecord.find(query)
      .populate('patientId', 'patientName age gender surgeryType createdBy appointedNurse')
      .sort({ surgeryDate: -1 });

    res.json(surgeries);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET single surgery record
exports.getSurgery = async (req, res) => {
  try {
    let query = { _id: req.params.id };

    const surgery = await SurgeryRecord.findOne(query).populate('patientId');
    if (!surgery) return res.status(404).json({ message: 'Surgery record not found' });

    // Scoped visibility verification
    const patient = surgery.patientId;
    if (patient) {
      if (req.userRole === 'doctor' && patient.createdBy.toString() !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to view this surgery record' });
      }
      if (req.userRole === 'nurse' && (!patient.appointedNurse || patient.appointedNurse.toString() !== req.userId)) {
        return res.status(403).json({ message: 'Not authorized to view this surgery record' });
      }
    }

    res.json(surgery);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST create surgery record
exports.createSurgery = async (req, res) => {
  try {
    let patientQuery = { _id: req.body.patientId };
    const patient = await Patient.findOne(patientQuery);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // Scoped visibility verification
    if (req.userRole === 'doctor' && patient.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to create surgery for this patient' });
    }
    if (req.userRole === 'nurse' && (!patient.appointedNurse || patient.appointedNurse.toString() !== req.userId)) {
      return res.status(403).json({ message: 'Not authorized to create surgery for this patient' });
    }

    const data = {
      ...req.body,
      patientWeight: patient.weight, // auto-fill from patient
      surgeryType: patient.surgeryType,
      createdBy: req.userId,
      createdByRole: req.userRole,
    };

    const record = await SurgeryRecord.create(data);
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: 'Validation error', error: err.message });
  }
};

// DELETE surgery record
exports.deleteSurgery = async (req, res) => {
  try {
    const record = await SurgeryRecord.findById(req.params.id).populate('patientId');
    if (!record) return res.status(404).json({ message: 'Record not found' });

    // Scoped visibility verification
    const patient = record.patientId;
    if (patient) {
      if (req.userRole === 'doctor' && patient.createdBy.toString() !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to delete this surgery record' });
      }
      if (req.userRole === 'nurse' && (!patient.appointedNurse || patient.appointedNurse.toString() !== req.userId)) {
        return res.status(403).json({ message: 'Not authorized to delete this surgery record' });
      }
    }

    await SurgeryRecord.findByIdAndDelete(req.params.id);
    res.json({ message: 'Surgery record deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Scoped visibility query
    let patientQuery = {};
    if (req.userRole === 'doctor') {
      patientQuery.createdBy = req.userId;
    } else if (req.userRole === 'nurse') {
      patientQuery.appointedNurse = req.userId;
    }

    const allowedPatients = await Patient.find(patientQuery);
    const allowedPatientIds = allowedPatients.map(p => p._id);
    const surgeryQuery = { patientId: { $in: allowedPatientIds } };

    const [totalSurgeriesToday, totalSurgeries, totalPatients, recentSurgeries, criticalPatients] = await Promise.all([
      SurgeryRecord.countDocuments({ ...surgeryQuery, surgeryDate: { $gte: today, $lt: tomorrow } }),
      SurgeryRecord.countDocuments(surgeryQuery),
      Patient.countDocuments(patientQuery),
      SurgeryRecord.find(surgeryQuery)
        .populate('patientId', 'patientName surgeryType createdBy appointedNurse')
        .sort({ createdAt: -1 })
        .limit(5),
      Patient.find({ ...patientQuery, status: 'Critical' }).populate('appointedNurse', 'fullName'),
    ]);

    // Blood loss & Fluid loss trends (last 7 days)
    const bloodLossTrend = [];
    const fluidLossTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);

      const records = await SurgeryRecord.find({
        ...surgeryQuery,
        surgeryDate: { $gte: d, $lt: next },
      });

      const avgBlood = records.length
        ? records.reduce((s, r) => s + (r.totalBloodLoss || 0), 0) / records.length
        : 0;

      const avgUrine = records.length
        ? records.reduce((s, r) => s + (r.urineCollected || 0), 0) / records.length
        : 0;

      const avgInsensible = records.length
        ? records.reduce((s, r) => s + (r.insensibleLoss || 0), 0) / records.length
        : 0;

      const avgFluid = records.length
        ? records.reduce((s, r) => s + (r.totalFluidLoss || 0), 0) / records.length
        : 0;

      const label = d.toLocaleDateString('en-US', { weekday: 'short' });

      bloodLossTrend.push({
        date: label,
        avgBloodLoss: Math.round(avgBlood),
        count: records.length,
      });

      fluidLossTrend.push({
        date: label,
        avgBloodLoss: Math.round(avgBlood),
        avgUrineLoss: Math.round(avgUrine),
        avgInsensibleLoss: Math.round(avgInsensible),
        avgFluidLoss: Math.round(avgFluid),
        count: records.length,
      });
    }

    res.json({
      totalSurgeriesToday,
      totalSurgeries,
      totalPatients,
      recentSurgeries,
      bloodLossTrend,
      fluidLossTrend,
      criticalPatients,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
