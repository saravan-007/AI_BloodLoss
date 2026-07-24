const mongoose = require('mongoose');

const patientNoteSchema = new mongoose.Schema({

    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },

    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },

    nurseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Nurse',
        required: true
    },

    note: {
        type: String,
        required: true,
        trim: true
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('PatientNote', patientNoteSchema);