const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: String, enum: ['user', 'bot', 'agent'], required: true },
  content: { type: String }, // text content
  richMedia: { type: mongoose.Schema.Types.Mixed }, // for carousels, images, etc.
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
