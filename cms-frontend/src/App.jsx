import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './index.css'; // ensure tailwind is imported

const SOCKET_URL = 'http://localhost:3000'; // Change in prod

function App() {
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'needs_human'

  useEffect(() => {
    const s = io(SOCKET_URL, {
      reconnectionAttempts: 5
    });
    setSocket(s);

    s.on('connect', () => {
      s.emit('join_cms');
    });

    s.on('new_message', ({ conversation, message }) => {
      // Update conversations list
      setConversations(prev => {
        const existingIdx = prev.findIndex(c => c._id === conversation._id);
        if (existingIdx > -1) {
          const newConvs = [...prev];
          newConvs[existingIdx] = conversation;
          return newConvs;
        } else {
          return [conversation, ...prev];
        }
      });

      // Update messages if this conversation is active
      if (activeConvId === conversation._id || !activeConvId) { // if no active, maybe auto select? handled later
        setMessages(prev => {
          // hacky way to check if message belongs to active conv, in real app need better state management
          return [...prev, message];
        });
      }
    });

    s.on('conversation_updated', (conv) => {
       setConversations(prev => {
        const existingIdx = prev.findIndex(c => c._id === conv._id);
        if (existingIdx > -1) {
          const newConvs = [...prev];
          newConvs[existingIdx] = conv;
          return newConvs;
        }
        return prev;
      });
    });

    return () => s.disconnect();
  }, [activeConvId]);

  const activeConv = conversations.find(c => c._id === activeConvId);

  const handleSend = () => {
    if (!replyText.trim() || !activeConvId) return;
    socket.emit('agent_reply', { conversationId: activeConvId, text: replyText });
    setReplyText('');
  };

  const filteredConversations = conversations.filter(c => {
    if (filter === 'needs_human') return c.status === 'needs_human';
    return true;
  });

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-blue-600 text-white">
          <h1 className="text-xl font-bold">Mộc Trà CMS</h1>
        </div>
        
        <div className="flex border-b border-gray-200">
          <button 
            className={`flex-1 py-3 text-sm font-medium ${filter === 'all' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            onClick={() => setFilter('all')}
          >
            Tất cả
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium ${filter === 'needs_human' ? 'border-b-2 border-red-500 text-red-500' : 'text-gray-500'}`}
            onClick={() => setFilter('needs_human')}
          >
            Cần hỗ trợ
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map(conv => (
            <div 
              key={conv._id}
              onClick={() => {
                setActiveConvId(conv._id);
                // Ideally fetch history for this conv, but for demo we just rely on new messages
              }}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${activeConvId === conv._id ? 'bg-blue-50' : ''}`}
            >
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-semibold text-gray-800">{conv.customerName || 'Khách hàng'}</h3>
                <span className="text-xs text-gray-400">{new Date(conv.updatedAt).toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 truncate">ID: {conv.customerId.substring(0, 8)}...</span>
                {conv.status === 'needs_human' && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                    CẦN HỖ TRỢ
                  </span>
                )}
                {conv.status === 'bot_handling' && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                    Bot
                  </span>
                )}
              </div>
            </div>
          ))}
          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-gray-400">Không có hội thoại nào</div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {activeConv ? (
          <>
            <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">
                Đang chat với: {activeConv.customerName}
              </h2>
              {activeConv.status === 'needs_human' && (
                <button className="px-4 py-2 bg-green-500 text-white rounded shadow text-sm font-medium">
                  Đánh dấu đã giải quyết
                </button>
              )}
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'agent' || msg.sender === 'bot' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md p-3 rounded-lg ${
                    msg.sender === 'agent' ? 'bg-blue-600 text-white' : 
                    msg.sender === 'bot' ? 'bg-gray-200 text-gray-800' : 
                    'bg-white border border-gray-200 text-gray-800'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    <span className="text-xs opacity-70 mt-1 block text-right">
                      {msg.sender === 'agent' ? 'Nhân viên' : msg.sender === 'bot' ? 'Bot' : 'Khách hàng'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white border-t border-gray-200 flex gap-2">
              <input 
                type="text" 
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSend()}
                placeholder="Nhập câu trả lời..." 
                className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handleSend}
                className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
              >
                Gửi
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Chọn một cuộc hội thoại để bắt đầu</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
