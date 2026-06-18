// Chatbot Widget logic
(function() {
  // Load Socket.io script dynamically
  const script = document.createElement('script');
  script.src = "https://cdn.socket.io/4.7.2/socket.io.min.js";
  script.onload = initWidget;
  document.head.appendChild(script);

  const BACKEND_URL = "http://localhost:3000"; // Update in production

  function initWidget() {
    // Generate a simple customer ID (session based)
    let customerId = localStorage.getItem('mt_customer_id');
    if (!customerId) {
      customerId = 'guest_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('mt_customer_id', customerId);
    }

    // Connect to Backend
    const socket = io(BACKEND_URL);

    // Create UI
    const launcher = document.createElement('div');
    launcher.id = 'mt-chat-launcher';
    launcher.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.03 2 11c0 2.846 1.48 5.37 3.8 7.026.066.864-.263 2.18-.748 3.16-.142.285.15.58.423.42 1.95-.89 3.51-1.64 4.54-1.92A10.983 10.983 0 0012 20c5.523 0 10-4.03 10-9s-4.477-9-10-9z"/></svg>`;
    
    const widget = document.createElement('div');
    widget.id = 'mt-chat-widget';
    widget.innerHTML = `
      <div class="mt-chat-header">
        Mộc Trà Silk CSKH
        <button class="mt-chat-close">&times;</button>
      </div>
      <div class="mt-chat-body" id="mt-chat-body">
        <div class="mt-msg bot">Dạ, Mộc Trà Silk xin chào! Mộc Trà có thể giúp gì cho quý khách ạ?</div>
      </div>
      <div class="mt-chat-input-container">
        <input type="text" id="mt-chat-input" class="mt-chat-input" placeholder="Nhập tin nhắn..." />
        <button id="mt-send-btn" class="mt-send-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(widget);

    const body = document.getElementById('mt-chat-body');
    const input = document.getElementById('mt-chat-input');
    const sendBtn = document.getElementById('mt-send-btn');
    const closeBtn = document.querySelector('.mt-chat-close');

    // Toggle chat
    launcher.addEventListener('click', () => {
      widget.classList.add('open');
      launcher.style.display = 'none';
      socket.emit('join_chat', { customerId });
    });

    closeBtn.addEventListener('click', () => {
      widget.classList.remove('open');
      setTimeout(() => launcher.style.display = 'flex', 300);
    });

    // Send message
    function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      
      appendMessage('user', text);
      socket.emit('send_message', { customerId, text });
      input.value = '';
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    // Receive message
    socket.on('new_message', (msg) => {
      if (msg.sender !== 'user') {
        appendMessage(msg.sender, msg.content);
        if (msg.richMedia && msg.richMedia.type === 'carousel') {
          appendCarousel(msg.richMedia.items);
        }
      }
    });

    socket.on('chat_history', (history) => {
      body.innerHTML = '';
      history.forEach(msg => {
        appendMessage(msg.sender, msg.content);
        if (msg.richMedia && msg.richMedia.type === 'carousel') {
          appendCarousel(msg.richMedia.items);
        }
      });
      scrollToBottom();
    });

    // UI Helpers
    function appendMessage(sender, text) {
      if (!text) return;
      const el = document.createElement('div');
      el.className = `mt-msg ${sender}`;
      el.innerText = text;
      body.appendChild(el);
      scrollToBottom();
    }

    function appendCarousel(items) {
      const container = document.createElement('div');
      container.className = 'mt-carousel';
      
      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'mt-product-card';
        card.innerHTML = `
          <img src="${item.image}" alt="${item.name}" class="mt-product-img" />
          <div class="mt-product-info">
            <div class="mt-product-name">${item.name}</div>
            <div class="mt-product-price">${item.price.toLocaleString('vi-VN')} ₫</div>
            <button class="mt-product-btn">Thêm vào giỏ</button>
          </div>
        `;
        container.appendChild(card);
      });

      body.appendChild(container);
      scrollToBottom();
    }

    function scrollToBottom() {
      body.scrollTop = body.scrollHeight;
    }
  }

  // Load CSS dynamically
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'styles.css'; // In production, this should be absolute URL
  document.head.appendChild(link);
})();
