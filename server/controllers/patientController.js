const Patient = require('../models/Patient');
const SurgeryRecord = require('../models/SurgeryRecord');
const Notification = require('../models/Notification');
const Nurse = require('../models/Nurse');

// GET all patients
exports.getPatients = async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = {};

    // Scoped visibility based on user role and identity
    if (req.userRole === 'doctor') {
      query.createdBy = req.userId;
    } else if (req.userRole === 'nurse') {
      query.appointedNurse = req.userId;
    }

    if (status) {
      query.status = status;
    } else {
      // Exclude Archived by default if no status filter is provided
      query.status = { $ne: 'Archived' };
    }

    if (search) {
      query.$or = [
        { patientName: { $regex: search, $options: 'i' } },
        { surgeryType: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const patients = await Patient.find(query).sort({ createdAt: -1 });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET single patient + surgery history
exports.getPatient = async (req, res) => {
  try {
    let query = { _id: req.params.id };
    const patient = await Patient.findOne(query);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // Scoped visibility verification
    if (req.userRole === 'doctor' && patient.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to view this patient' });
    }
    if (req.userRole === 'nurse' && (!patient.appointedNurse || patient.appointedNurse.toString() !== req.userId)) {
      return res.status(403).json({ message: 'Not authorized to view this patient' });
    }

    const surgeries = await SurgeryRecord.find({ patientId: patient._id }).sort({ surgeryDate: -1 });
    res.json({ patient, surgeries });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST create patient
exports.createPatient = async (req, res) => {
  try {
    const data = {
      ...req.body,
      createdBy: req.userId,
      createdByRole: req.userRole,
    };
    const patient = await Patient.create(data);

    if (patient.appointedNurse) {
      await Notification.create({
        recipient: patient.appointedNurse,
        recipientRole: 'nurse',
        title: 'New Patient Appointment',
        message: `You have been appointed to patient ${patient.patientName} for ${patient.surgeryType}.`,
        type: 'appointment',
        patientId: patient._id
      });
    }

    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ message: 'Validation error', error: err.message });
  }
};

exports.updatePatient = async (req, res) => {
  try {
    let query = { _id: req.params.id };
    const oldPatient = await Patient.findOne(query);
    if (!oldPatient) return res.status(404).json({ message: 'Patient not found' });

    // Scoped visibility verification
    if (req.userRole === 'doctor' && oldPatient.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this patient' });
    }
    if (req.userRole === 'nurse' && (!oldPatient.appointedNurse || oldPatient.appointedNurse.toString() !== req.userId)) {
      return res.status(403).json({ message: 'Not authorized to update this patient' });
    }

    // Security: Only nurses can update OT room
    if (req.body.otRoom && req.userRole !== 'nurse') {
      return res.status(403).json({ message: 'Only nurses can allot OT rooms' });
    }

    // Auto-set dischargedAt when status changes to Discharged
    if (req.body.status === 'Discharged' && oldPatient.status !== 'Discharged') {
      req.body.dischargedAt = new Date();
    }

    // Calculate changes for editLog
    const changes = [];
    const fieldsToTrack = [
      'patientName', 'age', 'gender', 'mobileNumber', 'weight', 
      'bloodGroup', 'surgeryType', 'allergies', 'medicalNotes', 
      'status', 'otRoom'
    ];

    fieldsToTrack.forEach(field => {
      if (req.body[field] !== undefined && String(req.body[field]) !== String(oldPatient[field] || '')) {
        const fieldLabel = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        changes.push(`${fieldLabel}: "${oldPatient[field] || 'None'}" -> "${req.body[field] || 'None'}"`);
      }
    });

    if (req.body.appointedNurse !== undefined && String(req.body.appointedNurse || '') !== String(oldPatient.appointedNurse || '')) {
      changes.push(`Appointed Nurse: changed`);
    }

    const updates = { ...req.body };
    if (changes.length > 0) {
      const logEntry = {
        editedBy: req.userId,
        editedByName: req.user?.fullName || 'Clinical Staff',
        action: req.body.status === 'Archived' && oldPatient.status !== 'Archived' 
          ? 'Patient Archived' 
          : (req.body.status !== 'Archived' && oldPatient.status === 'Archived' ? 'Patient Unarchived' : 'Profile Updated'),
        timestamp: new Date(),
        changes: changes.join(', ')
      };

      if (oldPatient.editLog) {
        updates.editLog = [...oldPatient.editLog, logEntry];
      } else {
        updates.editLog = [logEntry];
      }
    }

    const patient = await Patient.findByIdAndUpdate(req.params.id, updates, { new: true });

    // If appointedNurse is newly set or changed, create notification
    if (req.body.appointedNurse && req.body.appointedNurse.toString() !== (oldPatient.appointedNurse || '').toString()) {
      await Notification.create({
        recipient: req.body.appointedNurse,
        recipientRole: 'nurse',
        title: 'New Patient Appointment',
        message: `You have been appointed to patient ${patient.patientName} for ${patient.surgeryType}.`,
        type: 'appointment',
        patientId: patient._id
      });
    }

    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE patient
exports.deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // Scoped visibility verification
    if (req.userRole === 'doctor' && patient.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this patient' });
    }
    if (req.userRole === 'nurse' && (!patient.appointedNurse || patient.appointedNurse.toString() !== req.userId)) {
      return res.status(403).json({ message: 'Not authorized to delete this patient' });
    }

    await Patient.findByIdAndDelete(req.params.id);
    // Also delete surgery records
    await SurgeryRecord.deleteMany({ patientId: req.params.id });
    res.json({ message: 'Patient deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST add daily note (doctor only)
exports.addDailyNote = async (req, res) => {
  try {
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({ message: 'Note is required' });
    }

    // Only doctor can add notes
    if (req.userRole !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can add daily notes' });
    }

    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Scoped visibility verification
    if (patient.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to add notes for this patient' });
    }


    patient.dailyNotes.push({
      note,
      addedByName: req.user?.fullName || 'Doctor',
      createdBy: req.userId,
      createdAt: new Date()
    });

    await patient.save();

    // Notify the appointed nurse if there is one
    if (patient.appointedNurse) {
      await Notification.create({
        recipient: patient.appointedNurse,
        recipientRole: 'nurse',
        title: 'New Doctor Note',
        message: `Dr. added a new daily note for patient ${patient.patientName}.`,
        type: 'alert',
        patientId: patient._id
      });
    }

    res.json({ message: 'Daily note added successfully', patient });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PUT reply to a daily note (nurse only)
exports.replyToDailyNote = async (req, res) => {
  try {
    const { reply } = req.body;
    const { id, noteId } = req.params;

    if (!reply || !reply.trim()) {
      return res.status(400).json({ message: 'Reply text is required' });
    }

    // Only nurse can reply to notes
    if (req.userRole !== 'nurse') {
      return res.status(403).json({ message: 'Only nurses can reply to daily notes' });
    }

    const patient = await Patient.findById(id);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found or not authorized' });
    }

    // Scoped visibility verification
    if (!patient.appointedNurse || patient.appointedNurse.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to reply to notes for this patient' });
    }

    const noteIndex = patient.dailyNotes.findIndex(n => n._id.toString() === noteId);
    if (noteIndex === -1) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Initialize replies array if it doesn't exist (migration safety)
    if (!patient.dailyNotes[noteIndex].replies) {
      patient.dailyNotes[noteIndex].replies = [];
    }

    patient.dailyNotes[noteIndex].replies.push({
      reply: reply.trim(),
      repliedBy: req.userId,
      repliedByName: req.user?.fullName || 'Nurse',
      repliedAt: new Date()
    });

    await patient.save();

    res.json({ message: 'Reply added successfully', patient });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST save AI report for a patient
exports.saveAiReport = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // Scoped visibility verification
    if (req.userRole === 'doctor' && patient.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (req.userRole === 'nurse' && (!patient.appointedNurse || patient.appointedNurse.toString() !== req.userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    patient.aiReports.push({
      overallRiskLevel: req.body.overallRiskLevel,
      summary: req.body.summary,
      aiAnalysis: req.body.aiAnalysis,
      aiRecommendations: req.body.aiRecommendations || [],
      aiPrecautions: req.body.aiPrecautions || [],
      aiRisks: req.body.aiRisks || [],
      aiSuggestedMedication: req.body.aiSuggestedMedication || [],
      aiMonitoringAdvice: req.body.aiMonitoringAdvice || [],
      aiFollowUpSuggestions: req.body.aiFollowUpSuggestions || []
    });

    await patient.save();
    res.json({ message: 'AI report saved successfully', patient });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

