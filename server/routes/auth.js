const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP, setPassword, login, getMe, updateProfile, getNurses } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/send-otp',     sendOTP);
router.post('/verify-otp',   verifyOTP);
router.post('/set-password', setPassword);
router.post('/login',        login);
router.get('/me',            protect, getMe);
router.put('/profile',       protect, updateProfile);
router.get('/nurses',        protect, getNurses);

module.exports = router;
