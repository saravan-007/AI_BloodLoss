const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');

const protect = async (req, res, next) => {

  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Not authorized, no token'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.userId = decoded.id;
    req.userRole = decoded.role;

    if (decoded.role === 'doctor') {

      req.user = await Doctor.findById(decoded.id)
        .select('-password');

    } else if (decoded.role === 'nurse') {

      req.user = await Nurse.findById(decoded.id)
        .select('-password');

    }

    if (!req.user) {
      return res.status(401).json({
        message: 'User not found'
      });
    }

    next();

  } catch (err) {

    res.status(401).json({
      message: 'Token invalid or expired'
    });

  }

};

const authorize = (...roles) => {

  return (req, res, next) => {

    if (!roles.includes(req.userRole)) {

      return res.status(403).json({
        message: `Access denied for role: ${req.userRole}`
      });

    }

    next();

  };

};

module.exports = {
  protect,
  authorize
};