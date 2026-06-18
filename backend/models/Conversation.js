const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  source: { type: String, enum: ['website', 'zalo'], required: true },
  customerId: { type: String, required: true }, // unique identifier for customer (session ID or Zalo ID)
  customerName: { type: String, default: 'Khách hàng' },
  status: { type: String, enum: ['bot_handling', 'needs_human', 'resolved'], default: 'bot_handling' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Conversation', conversationSchema);
