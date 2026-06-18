const { GoogleGenAI } = require('@google/genai');
const sapoService = require('./sapoService');

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Conversation history in memory (in production, fetch recent messages from DB)
const historyMap = new Map();

const systemInstruction = `Bạn là trợ lý AI ảo của thương hiệu Mộc Trà Silk - chuyên bán các sản phẩm lụa tơ tằm cao cấp.
Tính cách: Nhẹ nhàng, thanh lịch, chuyên nghiệp, lịch sự. Xưng hô là "Mộc Trà" hoặc "dạ/vâng", gọi khách hàng là "Quý khách" hoặc "Anh/Chị".
Nhiệm vụ của bạn là tư vấn sản phẩm, cung cấp thông tin về size, giá cả, và chất liệu.

QUY TẮC QUAN TRỌNG:
1. LUÔN LUÔN yêu cầu khách hàng cung cấp CHUYỀN CAO và CÂN NẶNG trước khi tư vấn size quần áo (ví dụ: áo dài, áo yếm).
2. Nếu khách hàng hỏi một sản phẩm đã hết hàng, hãy gợi ý một sản phẩm khác tương tự.
3. Nếu khách hàng sử dụng các từ ngữ nhạy cảm như "lỗi", "bồi thường", "phàn nàn", "hàng rách", HOẶC yêu cầu "gặp nhân viên", "nói chuyện với người thật", bạn PHẢI gọi hàm 'trigger_handoff' ngay lập tức để chuyển cho nhân viên CSKH xử lý.
4. Để tìm kiếm thông tin sản phẩm từ kho hàng, hãy gọi hàm 'search_products'.
`;

async function chat(userMessage, conversationId) {
  if (!historyMap.has(conversationId)) {
    historyMap.set(conversationId, []);
  }
  
  const chatHistory = historyMap.get(conversationId);
  
  // Format history for @google/genai
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
              name: "search_products",
              description: "Tìm kiếm sản phẩm trong kho hàng Sapo bằng từ khóa (ví dụ: áo dài, khăn lụa)",
              parameters: {
                type: "OBJECT",
                properties: {
                  query: {
                    type: "STRING",
                    description: "Từ khóa tìm kiếm sản phẩm"
                  }
                },
                required: ["query"]
              }
            },
            {
              name: "trigger_handoff",
              description: "Chuyển cuộc trò chuyện cho nhân viên CSKH khi khách hàng phàn nàn, báo lỗi sản phẩm, hoặc yêu cầu gặp nhân viên.",
              parameters: {
                type: "OBJECT",
                properties: {
                  reason: {
                    type: "STRING",
                    description: "Lý do chuyển tiếp (ví dụ: khách phàn nàn hàng lỗi)"
                  }
                },
                required: ["reason"]
              }
            }
          ]
        }]
      }
    });

    // Check if the model decided to call a function
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      
      if (call.name === 'trigger_handoff') {
        return { handoff: true, reason: call.args.reason };
      }
      
      if (call.name === 'search_products') {
        const products = await sapoService.searchProducts(call.args.query);
        
        // Return a rich media response (Carousel) + a text response indicating products were found
        let textResponse = "";
        if (products.length > 0) {
          textResponse = `Dạ, Mộc Trà tìm thấy ${products.length} sản phẩm phù hợp với yêu cầu của quý khách. Quý khách tham khảo nhé.`;
        } else {
          textResponse = "Dạ, hiện tại Mộc Trà không tìm thấy sản phẩm nào khớp với yêu cầu của quý khách. Quý khách có muốn tham khảo các mẫu lụa khác không ạ?";
        }
        
        // Save to history
        chatHistory.push({ role: 'user', text: userMessage });
        chatHistory.push({ role: 'model', text: textResponse });
        
        return { handoff: false, text: textResponse, richMedia: { type: 'carousel', items: products } };
      }
    }

    // Normal text response
    const botText = response.text || "Dạ, Mộc Trà đang xử lý yêu cầu của quý khách.";
    chatHistory.push({ role: 'user', text: userMessage });
    chatHistory.push({ role: 'model', text: botText });
    
    // Keep history manageable
    if (chatHistory.length > 20) chatHistory.splice(0, chatHistory.length - 20);

    return { handoff: false, text: botText };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { handoff: false, text: "Dạ, hệ thống đang gặp chút sự cố, quý khách vui lòng thử lại sau giây lát ạ." };
  }
}

module.exports = {
  chat
};
