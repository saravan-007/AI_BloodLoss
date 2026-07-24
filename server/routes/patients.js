const express = require('express');
const router = express.Router();
const {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  addDailyNote,
  replyToDailyNote,
  saveAiReport
} = require('../controllers/patientController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getPatients).post(createPatient);
router.route('/:id').get(getPatient).put(updatePatient).delete(deletePatient);

// Daily notes
router.post('/:id/daily-note', addDailyNote);

// Nurse reply to a daily note
router.put('/:id/daily-note/:noteId/reply', replyToDailyNote);

// Save AI report for patient
router.post('/:id/ai-report', saveAiReport);

module.exports = router;
