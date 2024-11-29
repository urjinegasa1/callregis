const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  district: {
    type: String,
    required: true
  },
  bank: {
    type: String,
    required: true
  },
  problem: {
    type: String,
    required: true
  },
  terminal: {
    type: String,
    required: true
  },
  contact: {
    type: String,
    required: true,
    match: /^[0-9]{10}$/
  },
  comments: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Call', callSchema);