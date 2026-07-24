const express = require('express');
const router = express.Router();
const { analyzePatient, saveAnalysis } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

// Protect all AI routes — only authenticated doctors/nurses can use them
router.use(protect);

// POST /api/ai/analyze — full analysis or follow-up question
router.post('/analyze', analyzePatient);

// POST /api/ai/save-analysis — persist AI analysis to surgery record
router.post('/save-analysis', saveAnalysis);

module.exports = router;
