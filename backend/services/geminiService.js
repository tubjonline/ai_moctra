const { GoogleGenAI } = require('@google/genai');
const sapoService = require('./sapoService');

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Conversation history in memory
const historyMap = new Map();

const systemInstruction = `Bạn là trợ lý AI ảo kiêm nhân viên tư vấn bán hàng của thương hiệu Mộc Trà Silk - chuyên bán các sản phẩm lụa tơ tằm cao cấp.
Website: moctrasilk.com
Cửa hàng may đo: Tòa nhà C2, Số 14 Thụy Khuê, Phường Tây Hồ, Thành phố Hà Nội, Việt Nam.
Tính cách: Nhẹ nhàng, thanh lịch, chuyên nghiệp, lịch sự. Xưng hô là "Mộc Trà" hoặc "dạ/vâng", gọi khách hàng là "Quý khách" hoặc "Anh/Chị".

THÔNG TIN QUAN TRỌNG ĐỂ TƯ VẤN:

1. BẢNG SIZE ÁO DÀI NGƯỜI LỚN
Size XS: Chiều cao 148-155cm, Nặng 38-44kg, Ngực 76-80cm, Eo 58-62cm, Hông 82-86cm.
Size S: Chiều cao 150-158cm, Nặng 40-47kg, Ngực 80-84cm, Eo 62-66cm, Hông 86-90cm.
Size M: Chiều cao 155-162cm, Nặng 47-53kg, Ngực 84-88cm, Eo 66-70cm, Hông 90-94cm.
const systemInstruction = `
Bạn là nhân viên CSKH xuất sắc của Mộc Trà Silk - Thương hiệu áo dài thiết kế cao cấp.
Nhiệm vụ của bạn là tư vấn tận tình, lịch sự, chuyên nghiệp và chốt sale hiệu quả. Xưng hô "Mộc Trà" và "Anh/Chị".
Nếu khách có thái độ tiêu cực, dùng từ ngữ tục tĩu -> Gọi hàm 'trigger_handoff'.

KỊCH BẢN TƯ VẤN 5 BƯỚC (BẠN PHẢI TUÂN THỦ NGHIÊM NGẶT):

Bước 1: Chào hỏi. Nếu khách mới vào (chào hỏi chung chung), BẠN PHẢI GỌI HÀM 'welcome_screen'. Hàm này sẽ tự động hiển thị lời chào chuẩn, các mẫu áo dài nổi bật và nút chọn đối tượng. Không cần tự trả lời bằng văn bản ở bước này.
Bước 2: Hiển thị sản phẩm. Khi khách chọn đối tượng (ví dụ "Áo dài nữ"), BẠN PHẢI gọi hàm 'search_products' với từ khóa tương ứng để hiển thị ảnh. Nếu kho hết hàng, thông báo hết hàng và nhờ khách chọn mẫu khác.
Bước 3: Lấy số đo. Khi khách chọn "Thêm vào giỏ hàng" (tức là muốn mua mẫu đó), hỏi khách hàng về chiều cao, cân nặng, số đo 3 vòng (Ngực-Eo-Mông) để tư vấn size.
Bước 4: Tư vấn Size. Tra cứu xem số đo có phù hợp với bảng size không. 
   - Nếu KHÔNG có size phù hợp, trả lời Y HỆT câu sau: "Với số đo hiện tại, sản phẩm có thể không vừa hoàn toàn theo size tiêu chuẩn. Để đảm bảo form áo đẹp nhất, Mộc Trà khuyến khích Anh/Chị đến cửa hàng để may đo theo số đo riêng tại: Tòa nhà C2, Số 14 Thụy Khuê, Phường Tây Hồ, Thành phố Hà Nội, Việt Nam."
   - Nếu CÓ size phù hợp, kiểm tra xem size đó CÒN HÀNG không. Nếu hết hàng, hiển thị lại danh sách sản phẩm và nhờ khách chọn mẫu khác. Nếu khách không chịu chọn -> gọi 'trigger_handoff'.
Bước 5: Chốt đơn. Hỏi thông tin: Họ và tên, số điện thoại, địa chỉ nhận hàng. Sau đó gọi hàm 'create_draft_order' để lên đơn nháp và tự động chuyển thông tin cho nhân viên CSKH (CMS). Không cần yêu cầu chuyển khoản MB Bank.

LƯU Ý ĐẶC BIỆT: Khi khách nhấn "Bỏ khỏi giỏ" (tin nhắn "Tôi bỏ chọn mẫu..."), bạn xác nhận đã hủy chọn và mời họ xem mẫu khác.
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
              description: "Hiển thị màn hình chào mừng bao gồm lời chào chuẩn, 3 sản phẩm nổi bật và 3 nút phân loại. Gọi hàm này khi khách hàng mới bắt đầu chat.",
              parameters: { type: "OBJECT", properties: {} }
            },
            {
              name: "search_products",
              description: "Tìm kiếm sản phẩm (vd: áo dài nữ, khăn lụa) để hiển thị hình ảnh và thẻ sản phẩm cho khách.",
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
                    description: "Mảng chứa các lựa chọn dạng text (Ví dụ: ['Áo dài nam', 'Áo dài nữ'])"
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
              description: "Tạo đơn hàng nháp gửi cho nhân viên CSKH sau khi khách chốt mua hàng.",
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
                required: ["customerName", "phone", "productName", "size"]
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
        // Gửi tín hiệu tạo đơn nháp (sẽ xử lý ở server.js)
        const orderSummary = \`ĐƠN NHÁP: Khách \${call.args.customerName} (\${call.args.phone}) đặt \${call.args.productName} size \${call.args.size}.\`;
        return { 
          draftOrder: true, 
          orderData: call.args,
          text: \`Dạ, Mộc Trà đã lên đơn nháp thành công cho anh/chị. Để hoàn tất, anh/chị vui lòng chuyển khoản theo thông tin sau:\n\nNgân hàng: MB Bank\nSTK: 869783333\nChủ TK: CTY TNHH TM DV VA BAN LE MOC TRA\nChi nhánh: PGD Thanh Oai\n\nSau khi chuyển khoản, Anh/Chị vui lòng gửi giúp Mộc Trà ảnh màn hình giao dịch nhé.\`
        };
      }
      
      if (call.name === 'welcome_screen') {
        const botText = "Xin chào Anh/Chị, Mộc Trà rất hân hạnh được phục vụ.\nHiện tại Mộc Trà cung cấp nhiều dòng áo dài như:\n• Áo dài nữ\n• Áo dài nam\n• Áo dài trẻ em\n\nAnh/Chị có thể tham khảo các mẫu mới tại: moctrasilk.com. Dưới đây là một số mẫu áo dài được khách hàng lựa chọn nhiều nhất hiện nay. Mộc Trà sẵn sàng tư vấn để Anh/Chị lựa chọn được thiết kế phù hợp nhất.";
        const products = await sapoService.searchProducts("áo dài");
        const options = ["Áo dài nữ", "Áo dài nam", "Áo dài trẻ em"];
        
        chatHistory.push({ role: 'user', text: userMessage });
        chatHistory.push({ role: 'model', text: botText });
        
        return { 
          handoff: false, 
          text: botText, 
          richMedia: { type: 'mixed', products: products, options: options } 
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
          textResponse = \`Dạ, Mộc Trà gửi Anh/Chị thông tin một số sản phẩm phù hợp. Các mẫu này hiện đang còn size: \${products.map(p => p.availableSizes.join(', ')).join(' | ')}. Anh/Chị có thể tham khảo nhé.\`;
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
