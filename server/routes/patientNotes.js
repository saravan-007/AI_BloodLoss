const express = require('express');

const router = express.Router();

const {
    addNote,
    getNotes
} = require('../controllers/patientNoteController');

const {
    protect
} = require('../middleware/auth');

router.use(protect);


// Add note
router.post('/', addNote);


// Get notes
router.get('/:patientId', getNotes);

module.exports = router;