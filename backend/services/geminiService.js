const { GoogleGenAI } = require('@google/genai');
const sapoService = require('./sapoService');

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Conversation history in memory
const historyMap = new Map();

const systemInstruction = `Bạn là nhân viên CSKH xuất sắc của Mộc Trà Silk - Thương hiệu áo dài thiết kế cao cấp.
Website: moctrasilk.com
Cửa hàng may đo: Tòa nhà C2, Số 14 Thụy Khuê, Phường Tây Hồ, Thành phố Hà Nội, Việt Nam.
Nhiệm vụ của bạn là tư vấn tận tình, lịch sự, chuyên nghiệp và chốt sale hiệu quả. Xưng hô "Mộc Trà" và "Anh/Chị".
Nếu khách có thái độ tiêu cực, dùng từ ngữ tục tĩu -> Gọi hàm 'trigger_handoff'.

THÔNG TIN QUAN TRỌNG ĐỂ TƯ VẤN:
1. BẢNG SIZE ÁO DÀI NGƯỜI LỚN
Size XS: Chiều cao 148-155cm, Nặng 38-44kg, Ngực 76-80cm, Eo 58-62cm, Hông 82-86cm.
Size S: Chiều cao 150-158cm, Nặng 40-47kg, Ngực 80-84cm, Eo 62-66cm, Hông 86-90cm.
Size M: Chiều cao 155-162cm, Nặng 47-53kg, Ngực 84-88cm, Eo 66-70cm, Hông 90-94cm.
Size L: Chiều cao 158-165cm, Nặng 53-60kg, Ngực 88-92cm, Eo 70-74cm, Hông 94-98cm.
Size XL: Chiều cao 160-168cm, Nặng 60-68kg, Ngực 92-96cm, Eo 74-78cm, Hông 98-102cm.

2. BẢNG SIZE TRẺ EM
Size 2: 2-3 tuổi, Cao 92-98cm, Nặng 10-14kg.
Size 4: 3-4 tuổi, Cao 100-110cm, Nặng 15-20kg.
Size 6: 5-6 tuổi, Cao 110-120cm, Nặng 20-24kg.
Size 8: 7-8 tuổi, Cao 120-130cm, Nặng 26-30kg.
Size 10: 9-10 tuổi, Cao 130-140cm, Nặng 34-38kg.
Size 12: 11-12 tuổi, Cao 140-150cm, Nặng 40-45kg.

KỊCH BẢN TƯ VẤN 4 BƯỚC (BẠN PHẢI TUÂN THỦ NGHIÊM NGẶT THEO THỨ TỰ):

BƯỚC 1 - CHÀO HỎI: Khi khách mới vào (chào hỏi chung chung hoặc bắt đầu cuộc trò chuyện), BẠN PHẢI GỌI HÀM 'welcome_screen'. KHÔNG tự trả lời bằng văn bản. Hàm này sẽ tự động hiển thị lời chào và 3 nút chọn đối tượng.

BƯỚC 2 - HIỂN THỊ SẢN PHẨM: Khi khách chọn đối tượng (ví dụ "Áo dài nữ", "Áo dài nam", "Áo dài trẻ em"), BẠN PHẢI GỌI HÀM 'search_products' với từ khóa tương ứng. Khách nhấn nút "Đặt hàng" sẽ gửi tin nhắn "Tôi muốn mua mẫu: [tên sản phẩm]". Khi nhận được tin nhắn này, chuyển sang BƯỚC 3.

BƯỚC 3 - LẤY SỐ ĐO VÀ TƯ VẤN SIZE: Hỏi khách về chiều cao, cân nặng, số đo 3 vòng (Ngực-Eo-Mông) để tư vấn size.
   3.1 Nếu CÓ size phù hợp: Chuyển sang BƯỚC 4.
   3.2 Nếu KHÔNG có size phù hợp: Gọi hàm 'add_to_waitlist' để gửi vào danh sách chờ CMS. Trả lời Y HỆT câu sau: "Với số đo hiện tại, sản phẩm có thể không vừa hoàn toàn theo size tiêu chuẩn. Để đảm bảo form áo đẹp nhất, Mộc Trà khuyến khích Anh/Chị đến cửa hàng để may đo theo số đo riêng tại: Tòa nhà C2, Số 14 Thụy Khuê, Phường Tây Hồ, Thành phố Hà Nội, Việt Nam."

BƯỚC 4 - CHỐT ĐƠN: Hỏi thông tin khách hàng để lên đơn. 
   - Bạn cần thu thập ĐỦ 3 thông tin: 1. Họ và tên, 2. Số điện thoại (phải đúng định dạng 10 số tại Việt Nam), 3. Địa chỉ nhận hàng.
   - NẾU KHÁCH CUNG CẤP THIẾU THÔNG TIN (VD: thiếu địa chỉ, số điện thoại không đủ 10 số): Bạn PHẢI yêu cầu khách bổ sung cho đầy đủ.
   - KHÔNG ĐƯỢC gọi hàm 'create_draft_order' và KHÔNG ĐƯỢC gợi ý sản phẩm khác khi CHƯA thu thập đủ 3 thông tin hợp lệ trên.
   - CHỈ KHI ĐÃ CÓ ĐỦ THÔNG TIN: Gọi hàm 'create_draft_order'. Sau khi lên đơn xong, hệ thống sẽ tự động hỏi khách có muốn đặt thêm sản phẩm nào không.

LƯU Ý ĐẶC BIỆT CHUNG: 
- Khi khách nhấn "Bỏ khỏi giỏ" (tin nhắn "Tôi bỏ chọn mẫu..."), bạn xác nhận đã hủy chọn và mời họ xem mẫu khác.
- KHÔNG BAO GIỜ tự ý nhảy bước. Phải làm tuần tự 1 -> 2 -> 3 -> 4.
- Khi khách nói "Xem thêm" thì gọi lại hàm search_products với cùng từ khóa.
- LUÔN LUÔN trả lời khách bằng Tiếng Việt có dấu chuẩn xác (không viết không dấu).
`;

async function chat(userMessage, conversationId) {
  if (!historyMap.has(conversationId)) {
    historyMap.set(conversationId, []);
  }
  
  const chatHistory = historyMap.get(conversationId);
  
  const formattedHistory = chatHistory.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [...formattedHistory, { role: 'user', parts: [{ text: userMessage }] }],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        tools: [{
          functionDeclarations: [
            {
              name: "welcome_screen",
              description: "Hiển thị màn hình chào mừng với lời chào chuẩn và 3 nút phân loại áo dài. Gọi hàm này khi khách mới bắt đầu chat hoặc chào hỏi.",
              parameters: { type: "OBJECT", properties: {} }
            },
            {
              name: "search_products",
              description: "Tìm kiếm sản phẩm (vd: áo dài nữ, áo dài nam, áo dài trẻ em) để hiển thị hình ảnh và thẻ sản phẩm cho khách.",
              parameters: {
                type: "OBJECT",
                properties: { query: { type: "STRING" } },
                required: ["query"]
              }
            },
            {
              name: "show_options",
              description: "Hiển thị các nút bấm lựa chọn (Quick Replies) cho khách hàng trên màn hình chat.",
              parameters: {
                type: "OBJECT",
                properties: {
                  options: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                    description: "Mảng chứa các lựa chọn dạng text"
                  }
                },
                required: ["options"]
              }
            },
            {
              name: "trigger_handoff",
              description: "Chuyển cho nhân viên CSKH khi khách yêu cầu gặp người thật hoặc phàn nàn.",
              parameters: {
                type: "OBJECT",
                properties: { reason: { type: "STRING" } },
                required: ["reason"]
              }
            },
            {
              name: "create_draft_order",
              description: "Tạo đơn hàng nháp gửi cho nhân viên CSKH sau khi khách chốt mua hàng và ĐÃ CUNG CẤP ĐỦ Tên, SĐT hợp lệ, Địa chỉ.",
              parameters: {
                type: "OBJECT",
                properties: {
                  customerName: { type: "STRING", description: "Tên khách hàng" },
                  phone: { type: "STRING", description: "Số điện thoại" },
                  address: { type: "STRING", description: "Địa chỉ nhận hàng" },
                  productName: { type: "STRING", description: "Tên sản phẩm" },
                  size: { type: "STRING", description: "Size khách đặt" },
                  totalPrice: { type: "NUMBER", description: "Tổng tiền" }
                },
                required: ["customerName", "phone", "address", "productName", "size"]
              }
            },
            {
              name: "add_to_waitlist",
              description: "Gửi thông tin khách hàng vào danh sách chờ (CMS) khi không có size phù hợp.",
              parameters: {
                type: "OBJECT",
                properties: {
                  customerMessage: { type: "STRING", description: "Thông tin khách hàng và sản phẩm muốn mua" },
                  measurements: { type: "STRING", description: "Số đo của khách hàng" }
                },
                required: ["customerMessage"]
              }
            }
          ]
        }]
      }
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      
      if (call.name === 'trigger_handoff') {
        return { handoff: true, reason: call.args.reason };
      }

      if (call.name === 'create_draft_order') {
        const orderSummary = "ĐƠN NHÁP: Khách " + call.args.customerName + " (" + call.args.phone + ") đặt " + call.args.productName + " size " + call.args.size + ".";
        const botText = "Dạ, Mộc Trà đã lên đơn nháp thành công cho Anh/Chị. Cảm ơn Anh/Chị đã lựa chọn Mộc Trà Silk. Anh/Chị có muốn đặt thêm sản phẩm nào không ạ?";
        
        chatHistory.push({ role: 'user', text: userMessage });
        chatHistory.push({ role: 'model', text: botText });
        
        return { 
          draftOrder: true, 
          orderData: call.args,
          text: botText,
          richMedia: { type: 'options', items: ["Đặt thêm áo dài nữ", "Đặt thêm áo dài nam", "Đặt thêm áo dài trẻ em"] }
        };
      }

      if (call.name === 'add_to_waitlist') {
        const botText = "Với số đo hiện tại, sản phẩm có thể không vừa hoàn toàn theo size tiêu chuẩn.\n\nĐể đảm bảo form áo đẹp nhất, Mộc Trà khuyến khích Anh/Chị đến cửa hàng để may đo theo số đo riêng tại:\n\nTòa nhà C2, Số 14 Thụy Khuê, Phường Tây Hồ, Thành phố Hà Nội, Việt Nam.\n\nMộc Trà đã ghi nhận thông tin của Anh/Chị. Nhân viên sẽ liên hệ lại trong thời gian sớm nhất ạ.";
        
        chatHistory.push({ role: 'user', text: userMessage });
        chatHistory.push({ role: 'model', text: botText });
        
        return { 
          waitlist: true, 
          waitlistData: call.args,
          text: botText 
        };
      }
      
      if (call.name === 'welcome_screen') {
        const botText = "Xin chào Anh/Chị, Mộc Trà rất hân hạnh được phục vụ.\nHiện tại Mộc Trà cung cấp nhiều dòng áo dài như:\n• Áo dài nữ\n• Áo dài nam\n• Áo dài trẻ em\n\nAnh/Chị có thể tham khảo các mẫu mới tại: moctrasilk.com.\nMộc Trà sẵn sàng tư vấn để Anh/Chị lựa chọn được thiết kế phù hợp nhất.\n\nAnh/Chị đang có nhu cầu tìm mẫu cho đối tượng nào ạ?";
        const options = ["Áo dài nữ", "Áo dài nam", "Áo dài trẻ em"];
        
        chatHistory.push({ role: 'user', text: userMessage });
        chatHistory.push({ role: 'model', text: botText });
        
        return { 
          handoff: false, 
          text: botText, 
          richMedia: { type: 'options', items: options } 
        };
      }

      if (call.name === 'show_options') {
        const options = call.args.options || [];
        const botText = response.text || "Dạ, Anh/Chị vui lòng chọn một trong các tùy chọn sau ạ:";
        
        chatHistory.push({ role: 'user', text: userMessage });
        chatHistory.push({ role: 'model', text: botText });
        
        return { handoff: false, text: botText, richMedia: { type: 'options', items: options } };
      }

      if (call.name === 'search_products') {
        const products = await sapoService.searchProducts(call.args.query);
        
        let textResponse = "";
        if (products.length > 0) {
          const inStockProducts = products.filter(p => p.inStock);
          const outOfStockProducts = products.filter(p => !p.inStock);
          textResponse = "Dạ, Mộc Trà gửi Anh/Chị một số mẫu phù hợp. Anh/Chị có thể tham khảo và nhấn nút 'Đặt hàng' để chọn mẫu ưa thích nhé.";
          if (outOfStockProducts.length > 0) {
            textResponse += " (Lưu ý: Một số mẫu hiện đang hết hàng.)";
          }
        } else {
          textResponse = "Dạ, hiện tại Mộc Trà không tìm thấy sản phẩm nào khớp với yêu cầu của quý khách.";
        }
        
        chatHistory.push({ role: 'user', text: userMessage });
        chatHistory.push({ role: 'model', text: textResponse });
        
        return { handoff: false, text: textResponse, richMedia: { type: 'carousel', items: products } };
      }
    }

    const botText = response.text || "Dạ, Mộc Trà đang xử lý yêu cầu của quý khách.";
    chatHistory.push({ role: 'user', text: userMessage });
    chatHistory.push({ role: 'model', text: botText });
    
    if (chatHistory.length > 30) chatHistory.splice(0, chatHistory.length - 30);

    return { handoff: false, text: botText };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { handoff: false, text: "Dạ, hệ thống đang gặp chút sự cố, quý khách vui lòng thử lại sau giây lát ạ." };
  }
}

module.exports = { chat };
