const PatientNote = require('../models/PatientNote');
const Patient = require('../models/Patient');


// ADD NOTE
exports.addNote = async (req, res) => {

    try {

        const { patientId, note } = req.body;

        const patient = await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({
                message: 'Patient not found'
            });
        }

        // Only owner doctor can add notes
        if (
            patient.createdBy.toString() !== req.userId
        ) {
            return res.status(403).json({
                message: 'Not authorized'
            });
        }

        // Must have assigned nurse
        if (!patient.appointedNurse) {
            return res.status(400).json({
                message: 'No nurse assigned'
            });
        }

        const newNote = await PatientNote.create({

            patientId,

            doctorId: req.userId,

            nurseId: patient.appointedNurse,

            note

        });

        res.status(201).json(newNote);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: 'Server error'
        });

    }

};


// GET NOTES
exports.getNotes = async (req, res) => {

    try {

        const { patientId } = req.params;

        let query = {
            patientId
        };

        // Doctor sees own notes
        if (req.userRole === 'doctor') {

            query.doctorId = req.userId;

        }

        // Nurse sees assigned notes only
        else if (req.userRole === 'nurse') {

            query.nurseId = req.userId;

        }

        const notes = await PatientNote.find(query)
            .sort({ createdAt: -1 });

        res.json(notes);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: 'Server error'
        });

    }

};