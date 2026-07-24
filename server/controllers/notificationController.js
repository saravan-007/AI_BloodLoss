const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.userId)) {
      return res.json([]); 
    }

    const notifications = await Notification.find({ 
      recipient: req.userId, 
      recipientRole: req.userRole 
    }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.userId },
      { isRead: true },
      { new: true }
    );
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.createShareNotification = async (req, res) => {
  try {
    const { patientId, recipientId, recipientRole, message } = req.body;
    const notification = await Notification.create({
      recipient: recipientId,
      recipientRole: recipientRole,
      title: 'Report Shared',
      message: message || 'A surgery report has been shared with you.',
      type: 'report_share',
      patientId: patientId
    });
    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
