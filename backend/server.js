require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const geminiService = require('./services/geminiService');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

async function startServer() {
  // Use in-memory MongoDB for development if no URI provided
  if (!process.env.MONGODB_URI) {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log(`Connected to in-memory MongoDB at ${uri}`);
  } else {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected to MongoDB Atlas`);
  }

  // Socket.io for Real-time Chat
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    // Website widget will join a room based on their session/socket.id
    socket.on('join_chat', async ({ customerId }) => {
      // Find or create conversation
      let conv = await Conversation.findOne({ customerId, source: 'website' });
      if (!conv) {
        conv = await Conversation.create({ customerId, source: 'website' });
      }
      socket.join(conv._id.toString());
      socket.emit('chat_history', await Message.find({ conversationId: conv._id }).sort('createdAt'));
    });

    socket.on('send_message', async ({ customerId, text }) => {
      let conv = await Conversation.findOne({ customerId, source: 'website' });
      if (!conv) return;

      // Save user message
      const userMsg = await Message.create({
        conversationId: conv._id,
        sender: 'user',
        content: text
      });
      
      // Emit to CMS (room 'cms')
      io.to('cms').emit('new_message', { conversation: conv, message: userMsg });

      // If bot is handling
      if (conv.status === 'bot_handling') {
        try {
          // Call Gemini
          const botResponse = await geminiService.chat(text, conv._id);
          
          if (botResponse.handoff) {
            conv.status = 'needs_human';
            await conv.save();
            io.to('cms').emit('conversation_updated', conv);
            
            const handoffMsg = await Message.create({
              conversationId: conv._id,
              sender: 'bot',
              content: "Xin quý khách đợi trong giây lát, nhân viên CSKH sẽ hỗ trợ bạn ngay."
            });
            io.to(conv._id.toString()).emit('new_message', handoffMsg);
            io.to('cms').emit('new_message', { conversation: conv, message: handoffMsg });
          } else if (botResponse.draftOrder) {
            // Gui tin nhan bot cho khach (kem options "Dat them")
            const draftMsg = await Message.create({
              conversationId: conv._id,
              sender: 'bot',
              content: botResponse.text,
              richMedia: botResponse.richMedia
            });
            io.to(conv._id.toString()).emit('new_message', draftMsg);
            io.to('cms').emit('new_message', { conversation: conv, message: draftMsg });

            // Bao CMS co don moi
            const alertMsg = await Message.create({
              conversationId: conv._id,
              sender: 'bot',
              content: "HE THONG: Bot da chot don nhap cho khach: " + botResponse.orderData.productName + " size " + botResponse.orderData.size + ". Vui long kiem tra!"
            });
            io.to('cms').emit('new_message', { conversation: conv, message: alertMsg });
            io.to('cms').emit('conversation_updated', conv);
            
          } else if (botResponse.waitlist) {
            // Gui vao danh sach cho CMS
            conv.status = 'needs_human';
            await conv.save();
            io.to('cms').emit('conversation_updated', conv);
            
            const waitlistMsg = await Message.create({
              conversationId: conv._id,
              sender: 'bot',
              content: botResponse.text
            });
            io.to(conv._id.toString()).emit('new_message', waitlistMsg);

            const alertMsg = await Message.create({
              conversationId: conv._id,
              sender: 'bot',
              content: "HE THONG: Khach can may do rieng. " + (botResponse.waitlistData ? botResponse.waitlistData.customerMessage : '') + ". Vui long lien he tu van!"
            });
            io.to('cms').emit('new_message', { conversation: conv, message: alertMsg });
          } else {
            const botMsg = await Message.create({
              conversationId: conv._id,
              sender: 'bot',
              content: botResponse.text,
              richMedia: botResponse.richMedia
            });
            io.to(conv._id.toString()).emit('new_message', botMsg);
            io.to('cms').emit('new_message', { conversation: conv, message: botMsg });
          }
        } catch (error) {
          console.error(error);
        }
      }
    });

    // CMS staff joins 'cms' room
    socket.on('join_cms', () => {
      socket.join('cms');
    });

    // Staff replies
    socket.on('agent_reply', async ({ conversationId, text }) => {
      const conv = await Conversation.findById(conversationId);
      if (conv) {
        const agentMsg = await Message.create({
          conversationId: conv._id,
          sender: 'agent',
          content: text
        });
        io.to(conv._id.toString()).emit('new_message', agentMsg);
        io.to('cms').emit('new_message', { conversation: conv, message: agentMsg });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

startServer();
