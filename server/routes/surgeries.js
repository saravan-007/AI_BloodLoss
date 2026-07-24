const express = require('express');
const router = express.Router();
const { getSurgeries, getSurgery, createSurgery, deleteSurgery, getDashboardStats } = require('../controllers/surgeryController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getDashboardStats);
router.route('/').get(getSurgeries).post(createSurgery);
router.route('/:id').get(getSurgery).delete(deleteSurgery);

module.exports = router;
