const express = require('express');
const router = express.Router();
const Call = require('../models/Call');
const auth = require('../middleware/auth');

// Create new call
router.post('/api/calls/new', auth, async (req, res) => {
  try {
    const { bank, district, problem, terminal, contact, comments } = req.body;

    // Create new call
    const call = new Call({
      bank,
      district,
      problem,
      terminal,
      contact,
      comments,
      createdBy: req.user.id // Assuming auth middleware adds user to req
    });

    // Save to database
    await call.save();

    res.json({
      success: true,
      message: 'Call registered successfully',
      call
    });

  } catch (error) {
    console.error('Error creating call:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while creating call'
    });
  }
});

// Get all calls for user
router.get('/api/calls', auth, async (req, res) => {
  try {
    const calls = await Call.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      calls
    });

  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching calls'
    });
  }
});

module.exports = router;