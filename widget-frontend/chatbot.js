// Chatbot Widget logic
(function() {
  // Load Socket.io script dynamically
  const script = document.createElement('script');
  script.src = "https://cdn.socket.io/4.7.2/socket.io.min.js";
  script.onload = initWidget;
  document.head.appendChild(script);

  const BACKEND_URL = "https://ai-moctra.onrender.com"; // Update in production

  function initWidget() {
    // Generate a simple customer ID (session based)
    let customerId = localStorage.getItem('mt_customer_id');
    if (!customerId) {
      customerId = 'guest_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('mt_customer_id', customerId);
    }

    // Connect to Backend with max 5 retries to avoid infinite spam
    const socket = io(BACKEND_URL, {
      reconnectionAttempts: 5
    });

    // Track last search query for "Xem them" button
    let lastSearchQuery = '';

    // Create UI
    const launcher = document.createElement('div');
    launcher.id = 'mt-chat-launcher';
    launcher.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.03 2 11c0 2.846 1.48 5.37 3.8 7.026.066.864-.263 2.18-.748 3.16-.142.285.15.58.423.42 1.95-.89 3.51-1.64 4.54-1.92A10.983 10.983 0 0012 20c5.523 0 10-4.03 10-9s-4.477-9-10-9z"/></svg>';
    
    const widget = document.createElement('div');
    widget.id = 'mt-chat-widget';
    widget.innerHTML = '<div class="mt-chat-header">M\u1ed9c Tr\u00e0 Silk CSKH<div class="mt-header-actions"><button class="mt-chat-action-btn" id="mt-chat-reset" title="B\u1eaft \u0111\u1ea7u phi\u00ean chat m\u1edbi"><svg viewBox="0 0 24 24"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></button><button class="mt-chat-action-btn mt-chat-close" title="\u0110\u00f3ng">&times;</button></div></div><div class="mt-chat-body" id="mt-chat-body"><div class="mt-msg bot">D\u1ea1, M\u1ed9c Tr\u00e0 Silk xin ch\u00e0o! M\u1ed9c Tr\u00e0 c\u00f3 th\u1ec3 gi\u00fap g\u00ec cho qu\u00fd kh\u00e1ch \u1ea1?</div></div><div class="mt-chat-input-container"><input type="text" id="mt-chat-input" class="mt-chat-input" placeholder="Nh\u1eadp tin nh\u1eafn..." /><button id="mt-send-btn" class="mt-send-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button></div>';

    document.body.appendChild(launcher);
    document.body.appendChild(widget);

    const body = document.getElementById('mt-chat-body');
    const input = document.getElementById('mt-chat-input');
    const sendBtn = document.getElementById('mt-send-btn');
    const closeBtn = document.querySelector('.mt-chat-close');
    const resetBtn = document.getElementById('mt-chat-reset');

    // Toggle chat
    launcher.addEventListener('click', function() {
      widget.classList.add('open');
      launcher.style.display = 'none';
      socket.emit('join_chat', { customerId: customerId });
    });

    closeBtn.addEventListener('click', function() {
      widget.classList.remove('open');
      setTimeout(function() { launcher.style.display = 'flex'; }, 300);
    });

    // Reset Chat Session
    resetBtn.addEventListener('click', function() {
      if(confirm('B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n b\u1eaft \u0111\u1ea7u phi\u00ean chat m\u1edbi?')) {
        customerId = 'guest_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('mt_customer_id', customerId);
        body.innerHTML = '<div class="mt-msg bot">D\u1ea1, M\u1ed9c Tr\u00e0 Silk xin ch\u00e0o! M\u1ed9c Tr\u00e0 c\u00f3 th\u1ec3 gi\u00fap g\u00ec cho qu\u00fd kh\u00e1ch \u1ea1?</div>';
        lastSearchQuery = '';
        socket.disconnect();
        socket.connect();
        socket.emit('join_chat', { customerId: customerId });
      }
    });

    // Send message
    function sendMessage() {
      var text = input.value.trim();
      if (!text) return;
      appendMessage('user', text);
      socket.emit('send_message', { customerId: customerId, text: text });
      input.value = '';
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') sendMessage();
    });

    // Receive message
    socket.on('new_message', function(msg) {
      if (msg.sender !== 'user') {
        appendMessage(msg.sender, msg.content);
        if (msg.richMedia) {
          appendRichMedia(msg.richMedia);
        }
      }
    });

    socket.on('chat_history', function(history) {
      body.innerHTML = '';
      history.forEach(function(msg) {
        appendMessage(msg.sender, msg.content);
        if (msg.richMedia) {
          appendRichMedia(msg.richMedia);
        }
      });
      scrollToBottom();
    });

    // UI Helpers
    function appendMessage(sender, text) {
      if (!text) return;
      var el = document.createElement('div');
      el.className = 'mt-msg ' + sender;
      el.innerText = text;
      body.appendChild(el);
      scrollToBottom();
    }

    function appendRichMedia(media) {
      // Product List (Vertical)
      if (media.type === 'carousel' && media.items && media.items.length > 0) {
        // Remember the query for "Xem them"
        if (media.searchQuery) lastSearchQuery = media.searchQuery;
        
        var html = '<div class="mt-product-list">';
        media.items.forEach(function(item) {
          var stockLabel = item.inStock ? '' : '<div class="mt-out-of-stock">H\u1ebft h\u00e0ng</div>';
          var btnClass = item.inStock ? 'mt-order-btn' : 'mt-order-btn disabled';
          var btnText = item.inStock ? '\u0110\u1eb7t h\u00e0ng' : 'H\u1ebft h\u00e0ng';
          html += '<div class="mt-product-list-item">' +
            '<img src="' + item.image + '" alt="' + item.name + '">' +
            stockLabel +
            '<div class="mt-product-list-title">' + item.name + '</div>' +
            '<div class="mt-product-list-price">' + item.price.toLocaleString('vi-VN') + '\u0111</div>' +
            '<button class="' + btnClass + '" data-name="' + item.name + '"' + (item.inStock ? '' : ' disabled') + '>' + btnText + '</button>' +
            '</div>';
        });
        html += '</div>';
        
        // Add "Xem them" button
        html += '<div class="mt-quick-replies"><button class="mt-quick-reply-btn mt-see-more-btn">Xem th\u00eam m\u1eabu kh\u00e1c</button></div>';
        
        var div = document.createElement('div');
        div.innerHTML = html;
        body.appendChild(div);
        
        // Event listeners for "Dat hang" buttons
        var orderBtns = div.querySelectorAll('.mt-order-btn:not(.disabled)');
        orderBtns.forEach(function(btn) {
          btn.addEventListener('click', function() {
            var prodName = this.getAttribute('data-name');
            if (this.classList.contains('selected')) {
              this.classList.remove('selected');
              this.innerText = '\u0110\u1eb7t h\u00e0ng';
              var text = 'T\u00f4i b\u1ecf ch\u1ecdn m\u1eabu: ' + prodName;
              appendMessage('user', text);
              socket.emit('send_message', { customerId: customerId, text: text });
            } else {
              this.classList.add('selected');
              this.innerText = 'B\u1ecf ch\u1ecdn';
              var text = 'T\u00f4i mu\u1ed1n mua m\u1eabu: ' + prodName;
              appendMessage('user', text);
              socket.emit('send_message', { customerId: customerId, text: text });
            }
          });
        });
        
        // Event listener for "Xem them" button
        var seeMoreBtn = div.querySelector('.mt-see-more-btn');
        if (seeMoreBtn) {
          seeMoreBtn.addEventListener('click', function() {
            var text = 'Xem th\u00eam';
            appendMessage('user', text);
            socket.emit('send_message', { customerId: customerId, text: text });
          });
        }
      }
      
      // Quick Reply Buttons
      if (media.type === 'options' && media.items && media.items.length > 0) {
        var html = '<div class="mt-quick-replies">';
        media.items.forEach(function(opt) {
          html += '<button class="mt-quick-reply-btn">' + opt + '</button>';
        });
        html += '</div>';
        var div = document.createElement('div');
        div.innerHTML = html;
        body.appendChild(div);

        var newButtons = div.querySelectorAll('.mt-quick-reply-btn');
        newButtons.forEach(function(btn) {
          btn.addEventListener('click', function() {
            var text = this.innerText;
            div.remove();
            appendMessage('user', text);
            socket.emit('send_message', { customerId: customerId, text: text });
          });
        });
      }
      
      // Mixed type (products + options)
      if (media.type === 'mixed') {
        if (media.products) appendRichMedia({type: 'carousel', items: media.products});
        if (media.options) appendRichMedia({type: 'options', items: media.options});
      }
      
      scrollToBottom();
    }

    function scrollToBottom() {
      body.scrollTop = body.scrollHeight;
    }
  }

  // Load CSS dynamically
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'styles.css'; // In production, this should be absolute URL
  document.head.appendChild(link);
})();
